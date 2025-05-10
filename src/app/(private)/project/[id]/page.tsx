'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Project {
	_id: string;
	status: 'generating' | 'review' | 'error';
	generatedDesignVariations: Array<{
		variationId: string;
		sections: Array<{
			sectionName: string;
			designOutputUrl?: string;
			isSolidColor: boolean;
			solidColorValue?: string;
		}>;
	}>;
}

export default function ProjectPage() {
	const params = useParams();
	const [project, setProject] = useState<Project | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const isPolling = useRef(false);

	useEffect(() => {
		const fetchProject = async () => {
			if (isPolling.current) return;
			const { id } = params;
			try {
				isPolling.current = true;
				const response = await fetch(`/api/projects/${id}`);
				if (!response.ok) {
					throw new Error('Failed to fetch project');
				}
				const data = await response.json();
				setProject(data);
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to load project'
				);
			} finally {
				setLoading(false);
				isPolling.current = false;
			}
		};

		fetchProject();

		// Poll for updates if project is still generating
		const pollInterval = setInterval(() => {
			if (project?.status === 'generating') {
				fetchProject();
			}
		}, 5000); // Poll every 5 seconds

		return () => {
			clearInterval(pollInterval);
			isPolling.current = false;
		};
	}, [params.id, project?.status]);

	if (loading) {
		return (
			<Card className="w-full max-w-4xl mx-auto">
				<CardHeader>
					<CardTitle>Loading Project...</CardTitle>
				</CardHeader>
				<CardContent>
					<Progress value={undefined} className="w-full" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="w-full max-w-4xl mx-auto">
				<CardHeader>
					<CardTitle>Error</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	if (!project) {
		return (
			<Card className="w-full max-w-4xl mx-auto">
				<CardHeader>
					<CardTitle>Project Not Found</CardTitle>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-4xl mx-auto">
			<CardHeader>
				<CardTitle>
					{project.status === 'generating'
						? 'Generating Designs...'
						: 'Project Details'}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{project.status === 'generating' && (
					<div className="space-y-4">
						<Progress value={undefined} className="w-full" />
						<p className="text-sm text-muted-foreground">
							We&apos;re generating your packaging designs. This
							may take a few minutes...
						</p>
					</div>
				)}

				{project.status === 'error' && (
					<Alert variant="destructive">
						<AlertDescription>
							There was an error generating your designs. Please
							try again.
						</AlertDescription>
					</Alert>
				)}

				{project.status === 'review' && (
					<div className="grid grid-cols-2 gap-4">
						{project.generatedDesignVariations.map((variation) => (
							<Card key={variation.variationId}>
								<CardContent className="p-4">
									<div className="aspect-square relative">
										{/* Render the design preview here */}
										<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
											Design Preview
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
