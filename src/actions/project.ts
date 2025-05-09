'use server';

import { ProjectFormSchema, ProjectFormState } from '@/lib/definitions';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { verifySession } from '@/lib/data/auth';
import { uploadToS3 } from '@/lib/s3-upload';
import { generateTexture } from '@/lib/meshy-api';
import { redirect } from 'next/navigation';

export const createProject = async (
	// The 'state' parameter (prevState) from useActionState can be undefined initially
	prevState: ProjectFormState | undefined,
	formData: FormData
): Promise<ProjectFormState> => {
	// Ensure the return type matches
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			// For actions used with useActionState, it's better to return an error state
			// than to redirect directly from here if authentication fails before form processing.
			// However, if redirecting is the firm requirement for this specific check:
			redirect('/login');
			// If you prefer to show an error message on the form instead:
			// return { message: 'Authentication required. Please log in.' };
		}

		const validatedFields = ProjectFormSchema.safeParse({
			name: formData.get('name'),
			logoFile: formData.get('logo'), // Ensure this matches the input field name="logo"
			primaryColor: formData.get('primaryColor'),
			secondaryColor: formData.get('secondaryColor'),
			foodType: formData.get('foodType'),
			packagingType: formData.get('packagingType'),
		});

		if (!validatedFields.success) {
			return {
				errors: validatedFields.error.flatten().fieldErrors,
			};
		}

		const {
			name,
			logoFile, // This is a File object
			primaryColor,
			secondaryColor,
			foodType,
			packagingType,
		} = validatedFields.data;

		let logoUrl = '';
		try {
			if (logoFile && logoFile.size > 0) {
				logoUrl = await uploadToS3(logoFile, userId as string);
			} else {
				// This case should ideally be caught by Zod's refine,
				// but if it can still happen, conform to ProjectFormState
				return {
					errors: { logoFile: ['Logo file is invalid or missing.'] },
				};
			}
		} catch (uploadError) {
			console.error('Logo upload error:', uploadError);
			return {
				// Use 'message' for general errors as per ProjectFormState
				message: 'Failed to upload logo. Please try again.',
			};
		}

		await connectDB();

		const project = await Project.create({
			userId: userId,
			name,
			logoUrl,
			primaryColor,
			secondaryColor,
			foodType,
			packagingType,
			status: 'processing',
		});

		// const foodModelUrl =
		// 	foodType === 'burger'
		// 		? 's3://naturafund/food-models/burger.glb'
		// 		: 'https://cdn.meshy.ai/models/pizza.glb';

		const packagingModelUrl =
			packagingType === 'clamshell'
				? 's3://naturafund/packging-models/clamshell.glb'
				: 'https://cdn.meshy.ai/models/pizza_box.glb';

		// Asynchronously trigger texture generation (fire and forget for this action's response)
		generateTexture({
			packagingModelUrl,
			primaryColor,
			secondaryColor,
			packagingType,
			foodType,
		})
			.then(async (textureResult) => {
				if (textureResult.success && textureResult.textureUrl) {
					await Project.findByIdAndUpdate(project._id, {
						brandedTextureUrl: textureResult.textureUrl,
						status: 'ready',
					});
				} else {
					await Project.findByIdAndUpdate(project._id, {
						status: 'error',
					});
				}
			})
			.catch((textureError) => {
				console.error(
					'Background texture generation error:',
					textureError
				);
				Project.findByIdAndUpdate(project._id, {
					// Fire and forget update
					status: 'error',
				}).catch((dbError) =>
					console.error(
						'Error updating project status after texture error:',
						dbError
					)
				);
			});

		// On success, redirect. useActionState will not receive a new state from this path.
		redirect(`/project/${project._id.toString()}`);
	} catch (error) {
		console.error('Project creation error:', error);
		return {
			// Use 'message' for general errors
			message: 'Failed to create project. Please try again later.',
		};
	}
};
