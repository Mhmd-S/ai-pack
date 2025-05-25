import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { verifySession } from '@/lib/data/auth';
import mongoose from 'mongoose';

interface Params {
	params: { id: string };
}

// GET a specific project by ID
export async function GET(request: Request, { params }: Params) {
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		await connectDB();
		const { id } = await params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: 'Invalid project ID format' },
				{ status: 400 }
			);
		}

		const project = await Project.findOne({ _id: id, userId });

		if (!project) {
			return NextResponse.json(
				{ error: 'Project not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json(project);
	} catch (error) {
		console.error('Error fetching project:', error);
		return NextResponse.json(
			{ message: 'Failed to fetch project' },
			{ status: 500 }
		);
	}
}

// PATCH (update) an existing project by ID
export async function PATCH(request: Request, { params }: Params) {
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		await connectDB();
		const { id } = await params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: 'Invalid project ID format' },
				{ status: 400 }
			);
		}

		const updates = await request.json();

		// Ensure userId cannot be updated
		if (updates.userId) {
			delete updates.userId;
		}
		// Ensure timestamps are not updated directly by client
		if (updates.createdAt) {
			delete updates.createdAt;
		}
		if (updates.updatedAt) {
			delete updates.updatedAt;
		}

		console.log('updates', updates.model.faces[0].designElements);

		const updatedProject = await Project.findOneAndUpdate(
			{ _id: id, userId },
			{ $set: updates },
			{ new: true, runValidators: true }
		);

		if (!updatedProject) {
			return NextResponse.json(
				{ error: 'Project not found or unauthorized' },
				{ status: 404 }
			);
		}

		return NextResponse.json(updatedProject);
	} catch (error) {
		console.error('Error updating project:', error);
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to update project';
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

// DELETE a project by ID
export async function DELETE(request: Request, { params }: Params) {
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		await connectDB();
		const { id } = await params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return NextResponse.json(
				{ error: 'Invalid project ID format' },
				{ status: 400 }
			);
		}

		const deletedProject = await Project.findOneAndDelete({
			_id: id,
			userId,
		});

		if (!deletedProject) {
			return NextResponse.json(
				{ error: 'Project not found or unauthorized' },
				{ status: 404 }
			);
		}

		return NextResponse.json({ message: 'Project deleted successfully' });
	} catch (error) {
		console.error('Error deleting project:', error);
		return NextResponse.json(
			{ message: 'Failed to delete project' },
			{ status: 500 }
		);
	}
}
