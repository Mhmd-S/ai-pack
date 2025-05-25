import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';
import { verifySession } from '@/lib/data/auth';

export async function GET() {
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
			.select('_id model.modelType model.modelPath status createdAt')
			.sort({ createdAt: -1 });

		// Transform the projects to match the interface expected by the sidebar
		const transformedProjects = projects.map((project) => ({
			id: project._id.toString(),
			modelType: project.model.modelType,
			modelPath: project.model.modelPath,
			status: project.status,
			createdAt: project.createdAt,
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

		const projectData = await request.json();

		if (
			!projectData ||
			!projectData.model ||
			!projectData.model.modelType
		) {
			return NextResponse.json(
				{
					error: 'Invalid project data: model and modelType are required',
				},
				{ status: 400 }
			);
		}

		await connectDB();

		const newProject = await Project.create({
			...projectData,
			userId,
		});

		return NextResponse.json(newProject, { status: 201 });
	} catch (error) {
		console.error('Error creating project:', error);
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to create project';
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
