import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { verifySession } from '@/lib/data/auth';

export async function GET(
	request: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const { isAuth, userId } = await verifySession();
		if (!isAuth || !userId) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}
    const { id } = await params;
		await connectDB();
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
			{ message: 'Failed to fetch project details' },
			{ status: 500 }
		);
	}
}
