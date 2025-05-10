import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';

export async function POST(request: Request) {
	try {
		const payload = await request.json();

		// Verify the webhook payload
		if (!payload.id || !payload.status) {
			return NextResponse.json(
				{ error: 'Invalid webhook payload' },
				{ status: 400 }
			);
		}

		await connectDB();

		// Find the project that contains this prediction
		const project = await Project.findOne({
			'generatedDesignVariations.sections.designOutputUrl': payload.id,
		});

		if (!project) {
			return NextResponse.json(
				{ error: 'Project not found' },
				{ status: 404 }
			);
		}

		// Update the project based on the prediction status
		if (payload.status === 'succeeded' && Array.isArray(payload.output)) {
			// Find and update the specific section with the new design output
			const updatedVariations = project.generatedDesignVariations.map(
				(variation) => {
					const updatedSections = variation.sections.map(
						(section) => {
							if (section.designOutputUrl === payload.id) {
								return {
									...section,
									designOutputUrl: payload.output[0], // The generated SVG URL
								};
							}
							return section;
						}
					);
					return { ...variation, sections: updatedSections };
				}
			);

			project.generatedDesignVariations = updatedVariations;

			// Check if all sections are complete
			const allSectionsComplete = project.generatedDesignVariations.every(
				(variation) =>
					variation.sections.every(
						(section) =>
							section.isSolidColor ||
							(section.designOutputUrl &&
								!section.designOutputUrl.includes('replicate'))
					)
			);

			if (allSectionsComplete) {
				project.status = 'review';
			}
		} else if (payload.status === 'failed') {
			project.status = 'error';
		}

		await project.save();

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error processing webhook:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
