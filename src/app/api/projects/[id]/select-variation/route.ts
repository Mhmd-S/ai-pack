import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import mongoose from 'mongoose';

interface SelectVariationRequestBody {
	variationId: string;
}

export async function PATCH(
	request: Request,
	{ params }: { params: { id: string } }
) {
	const { id: projectId } = params;
	let requestBody: SelectVariationRequestBody;

	try {
		requestBody = await request.json();
	} catch {
		return NextResponse.json(
			{ message: 'Invalid request body' },
			{ status: 400 }
		);
	}

	const { variationId } = requestBody;

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

	await connectDB();

	try {
		const project = await Project.findById(projectId);

		if (!project) {
			return NextResponse.json(
				{ message: 'Project not found' },
				{ status: 404 }
			);
		}

		const variationExists = project.generatedDesignVariations.find(
			(v: { variationId: string }) => v.variationId === variationId
		);

		if (!variationExists) {
			return NextResponse.json(
				{ message: 'Variation not found in this project' },
				{ status: 404 }
			);
		}

		// Keep only the selected variation
		project.generatedDesignVariations = [variationExists];
		project.selectedVariationId = variationId;

		// Optionally, update project status if needed, e.g.:
		// if (project.status === 'generating' || project.status === 'review') {
		//     project.status = 'review'; // Or 'editing', if you add such a status
		// }

		const updatedProject = await project.save();

		return NextResponse.json(updatedProject, { status: 200 });
	} catch (error) {
		console.error('Error selecting variation:', error);
		let errorMessage = 'Failed to select variation';
		if (error instanceof Error) {
			errorMessage = error.message;
		}
		return NextResponse.json({ message: errorMessage }, { status: 500 });
	}
}
