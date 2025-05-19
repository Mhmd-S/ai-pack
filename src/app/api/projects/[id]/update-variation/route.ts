import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project, { ISectionDesign, ProjectDocument } from '@/lib/models/Project';
import mongoose from 'mongoose';

interface UpdateVariationRequestBody {
	variationId: string;
	sections: ISectionDesign[];
}

export async function PATCH(
	request: Request,
	{ params }: { params: { id: string } }
) {
	const { id: projectId } = params;
	let requestBody: UpdateVariationRequestBody;

	try {
		requestBody = await request.json();
	} catch {
		return NextResponse.json(
			{ message: 'Invalid request body' },
			{ status: 400 }
		);
	}

	const { variationId, sections } = requestBody;

	if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
		return NextResponse.json(
			{ message: 'Invalid project ID' },
			{ status: 400 }
		);
	}

	if (!variationId) {
		return NextResponse.json(
			{ message: 'Variation ID is required' },
			{ status: 400 }
		);
	}

	if (!sections || !Array.isArray(sections)) {
		return NextResponse.json(
			{ message: 'Sections array is required' },
			{ status: 400 }
		);
	}

	await connectDB();

	try {
		const project = (await Project.findById(
			projectId
		)) as ProjectDocument | null;

		if (!project) {
			return NextResponse.json(
				{ message: 'Project not found' },
				{ status: 404 }
			);
		}

		const variationIndex = project.generatedDesignVariations.findIndex(
			(v) => v.variationId === variationId
		);

		if (variationIndex === -1) {
			return NextResponse.json(
				{ message: 'Variation not found in this project' },
				{ status: 404 }
			);
		}

		// Validate sections (basic validation, can be expanded)
		for (const section of sections) {
			if (
				!section.sectionName ||
				typeof section.isSolidColor !== 'boolean'
			) {
				return NextResponse.json(
					{
						message:
							'Invalid section data: sectionName and isSolidColor are required.',
					},
					{ status: 400 }
				);
			}
			if (
				section.isSolidColor &&
				typeof section.solidColorValue !== 'string'
			) {
				return NextResponse.json(
					{
						message: `Invalid section data: solidColorValue is required for solid color section ${section.sectionName}.`,
					},
					{ status: 400 }
				);
			}
			if (
				!section.isSolidColor &&
				section.designOutputUrl &&
				typeof section.designOutputUrl !== 'string'
			) {
				return NextResponse.json(
					{
						message: `Invalid section data: designOutputUrl must be a string for textured section ${section.sectionName}.`,
					},
					{ status: 400 }
				);
			}
		}

		// Update the specific variation's sections
		project.generatedDesignVariations[variationIndex].sections = sections;
		project.markModified('generatedDesignVariations'); // Important for nested arrays

		const updatedProject = await project.save();

		return NextResponse.json(updatedProject, { status: 200 });
	} catch (error) {
		console.error('Error updating variation:', error);
		let errorMessage = 'Failed to update variation';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return NextResponse.json({ message: errorMessage }, { status: 500 });
	}
}
