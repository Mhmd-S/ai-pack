import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { uploadFromCDN } from '@/lib/s3-upload';
import { verifyReplicateWebhook } from '@/lib/webhook/webhook-verification';
import mongoose from 'mongoose';

export async function POST(
	request: Request,
	{
		params,
	}: {
		params: { projectId: string; variationId: string; sectionName: string };
	}
) {
	try {
		// Connect to database
		await connectDB();

		// Verify the webhook signature and get the body
		const { isValid, body } = await verifyReplicateWebhook(request);

		if (!isValid) {
			return NextResponse.json(
				{ error: 'Invalid webhook signature' },
				{ status: 401 }
			);
		}

		if (!body) {
			return NextResponse.json(
				{ error: 'Invalid webhook body' },
				{ status: 400 }
			);
		}

		const { projectId, variationId, sectionName } = await params;

		// Validate project ID format
		if (!mongoose.Types.ObjectId.isValid(projectId)) {
			return NextResponse.json(
				{ error: 'Invalid project ID format' },
				{ status: 400 }
			);
		}

		// Get the project to get the userId
		const project = await Project.findById(projectId);
		if (!project) {
			return NextResponse.json(
				{ error: 'Project not found' },
				{ status: 404 }
			);
		}

		// Verify the prediction status
		if (body.status !== 'succeeded') {
			if (body.status === 'failed') {
				await Project.findByIdAndUpdate(
					projectId,
					{
						$set: {
							'generatedDesignVariations.$[variation].sections.$[section].status':
								'error',
							'generatedDesignVariations.$[variation].sections.$[section].error':
								body.error,
						},
					},
					{
						arrayFilters: [
							{ 'variation.variationId': variationId },
							{ 'section.sectionName': sectionName },
						],
					}
				);
			}
			return NextResponse.json({ status: 'ok' });
		}

		// Get the generated image URL from the output
		const imageUrl = body.output;
		if (!imageUrl) {
			throw new Error('No image URL in the output');
		}

		console.log('Image URL', imageUrl);
		// Upload the image to S3
		const designOutputUrl = await uploadFromCDN(imageUrl, project.userId);

		// Update the project with the generated design
		await Project.findByIdAndUpdate(
			projectId,
			{
				$set: {
					'generatedDesignVariations.$[variation].sections.$[section].status':
						'completed',
					'generatedDesignVariations.$[variation].sections.$[section].designOutputUrl':
						designOutputUrl,
				},
			},
			{
				arrayFilters: [
					{ 'variation.variationId': variationId },
					{ 'section.sectionName': sectionName },
				],
			}
		);

		// Check if all sections that need generation are completed
		const updatedProject = await Project.findById(projectId);
		if (!updatedProject) {
			throw new Error('Project not found after update');
		}

		// Find the current variation
		const variation = updatedProject.generatedDesignVariations.find(
			(v: { variationId: string }) => v.variationId === variationId
		);

		if (!variation) {
			throw new Error('Variation not found');
		}

		// Check if all sections that need generation are completed
		const allSectionsCompleted = variation.sections.every(
			(section: { status: string; isSolidColor: boolean }) =>
				// A section is considered complete if:
				// 1. It's a solid color (no generation needed)
				// 2. It has a completed status
				// 3. It has a designOutputUrl (indicating successful generation)
				section.isSolidColor || section.designOutputUrl
		);

		// If all sections are completed and the project is in generating/processing state,
		// update the status to review
		if (
			allSectionsCompleted &&
			['generating', 'processing'].includes(updatedProject.status)
		) {
			await Project.findByIdAndUpdate(projectId, {
				status: 'review',
			});
		}

		return NextResponse.json({ status: 'ok' });
	} catch (error) {
		console.error('Webhook error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
