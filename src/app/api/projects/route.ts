import { NextResponse } from 'next/server';
import { ProjectFormSchema } from '@/lib/definitions';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { verifySession } from '@/lib/data/auth';
import { uploadToS3, uploadFromCDN } from '@/lib/s3-upload';
import { burgerClamshellStandard } from '@/lib/dielines/burgerClamshell-standard';
import { v4 as uuidv4 } from 'uuid';
import { ReplicateAPI } from '@/lib/replicate-api';

export async function GET(request: Request) {
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		await connectDB();
		const projects = await Project.find({ userId })
			.select(
				'_id userInputs.businessName userInputs.colors status createdAt'
			)
			.sort({ createdAt: -1 });

		// Transform the projects to match the interface expected by the sidebar
		const transformedProjects = projects.map((project) => ({
			id: project._id.toString(),
			name: project.userInputs.businessName,
			color: project.userInputs.colors[0], // Use the primary color
			status: project.status,
		}));

		return NextResponse.json(transformedProjects);
	} catch (error) {
		console.error('Error fetching projects:', error);
		return NextResponse.json(
			{ message: 'Failed to fetch projects' },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const formData = await request.formData();
		const validatedFields = ProjectFormSchema.safeParse({
			name: formData.get('name'),
			logoFile: formData.get('logo'),
			primaryColor: formData.get('primaryColor'),
			secondaryColor: formData.get('secondaryColor'),
			packagingType: formData.get('packagingType'),
			tagLine: formData.get('tagLine'),
			styleCue: formData.get('styleCue'),
		});

		if (!validatedFields.success) {
			return NextResponse.json(
				{ errors: validatedFields.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const {
			name,
			logoFile,
			primaryColor,
			secondaryColor,
			packagingType,
			tagLine,
			styleCue,
		} = validatedFields.data;

		let logoUrl = '';
		try {
			if (logoFile && logoFile.size > 0) {
				logoUrl = await uploadToS3(logoFile, userId);
			} else {
				return NextResponse.json(
					{
						errors: {
							logoFile: ['Logo file is invalid or missing.'],
						},
					},
					{ status: 400 }
				);
			}
		} catch (uploadError) {
			console.error('Logo upload error:', uploadError);
			return NextResponse.json(
				{ message: 'Failed to upload logo. Please try again.' },
				{ status: 500 }
			);
		}

		await connectDB();

		const project = await Project.create({
			userId: userId,
			userInputs: {
				businessName: name,
				logoUrl,
				colors: [primaryColor, secondaryColor],
				tagLine,
				styleCue,
			},
			packagingType,
			status: 'generating',
			generatedDesignVariations: [],
		});

		const projectId = project._id.toString();

		// Initialize Replicate API
		const replicate = new ReplicateAPI(
			process.env.REPLICATE_API_KEY as string
		);

		// Start predictions in the background
		(async () => {
			try {
				const variations = [];
				for (let i = 0; i < 4; i++) {
					const variationId = uuidv4();
					const sections = [];

					for (const section of burgerClamshellStandard.sections) {
						if (section.isAiGenerated) {
							const webhookUrl = `https://johny.ngrok.dev/api/webhooks/replicate/${projectId}/${variationId}/${section.sectionName}`;

							const input = {
								size: '1024x1024',
								style: 'any',
								prompt: `
                  Colors to use: ${primaryColor} & ${secondaryColor}
                  Logo: ${logoUrl}
                  Tagline: ${tagLine}
                  Style cue: ${styleCue}
                `,
							};

							await replicate.generateSVG(input, webhookUrl);

							sections.push({
								sectionName: section.sectionName,
								status: 'generating',
								isSolidColor: false,
							});
						} else {
							sections.push({
								sectionName: section.sectionName,
								isSolidColor: true,
								solidColorValue: primaryColor,
							});
						}
					}

					variations.push({
						variationId,
						sections,
					});
				}

				await Project.findByIdAndUpdate(project._id, {
					generatedDesignVariations: variations,
				});
			} catch (error) {
				console.error('Error in background prediction:', error);
				await Project.findByIdAndUpdate(project._id, {
					status: 'error',
				});
			}
		})();

		return NextResponse.json({ projectId }, { status: 201 });
	} catch (error) {
		console.error('Project creation error:', error);
		return NextResponse.json(
			{ message: 'Failed to create project. Please try again later.' },
			{ status: 500 }
		);
	}
}
