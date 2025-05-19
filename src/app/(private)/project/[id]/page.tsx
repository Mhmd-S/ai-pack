'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { GeneratingDesignsLoader } from '@/components/GeneratingDesignsLoader';
import OBJModelViewer from '@/components/preview/DesignPreview3D';
import DxfParserComponent from '@/components/DxfParserComponent';
interface Project {
	_id: string;
	status: 'generating' | 'review' | 'error';
	userInputs: {
		businessName: string;
	};
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
	const router = useRouter();
	const [project, setProject] = useState<Project | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const isPolling = useRef(false);

	useEffect(() => {
		const fetchProject = async () => {
			if (isPolling.current) return;
			const { id } = params;
			try {
				isPolling.current = true;
				setLoading(true);
				const response = await fetch(`/api/projects/${id}`);
				if (!response.ok) {
					throw new Error('Failed to fetch project');
				}
				const data = await response.json();
				setProject(data);
				if (
					data.status === 'review' &&
					data.generatedDesignVariations &&
					data.generatedDesignVariations.length === 1
				) {
					const singleVariation = data.generatedDesignVariations[0];
					if (singleVariation && singleVariation.variationId) {
						router.push(
							`/project/${data._id}/edit/${singleVariation.variationId}`
						);
					}
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to load project'
				);
			} finally {
				isPolling.current = false;
				setLoading(false);
			}
		};

		fetchProject();

		// Poll for updates if project is still generating
		const pollInterval = setInterval(() => {
			if (project?.status === 'generating') {
				fetchProject();
			}
		}, 5000);

		return () => {
			clearInterval(pollInterval);
			isPolling.current = false;
		};
	}, [params, project?.status, router]);

	const getStatusBadge = () => {
		switch (project?.status) {
			case 'generating':
				return (
					<Badge className="bg-amber-100 text-amber-800 border-0 px-3 py-1">
						<div className="flex items-center gap-1.5">
							<div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
							Generating
						</div>
					</Badge>
				);
			case 'review':
				return (
					<Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
						<div className="flex items-center gap-1.5">
							<div className="w-2 h-2 rounded-full bg-green-500"></div>
							Ready for Review
						</div>
					</Badge>
				);
			case 'error':
				return (
					<Badge className="bg-red-100 text-red-800 border-0 px-3 py-1">
						<div className="flex items-center gap-1.5">
							<div className="w-2 h-2 rounded-full bg-red-500"></div>
							Error
						</div>
					</Badge>
				);
			default:
				return null;
		}
	};

	if (loading && !project) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[100vh] p-6">
				<GeneratingDesignsLoader />
				<p className="mt-4 text-muted-foreground">
					Loading project details...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<Alert variant="destructive" className="mb-6">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<Button onClick={() => router.push('/projects')}>
					Back to Projects
				</Button>
			</div>
		);
	}

	const currentDesign = project?.generatedDesignVariations[0];

	return (
		<div className="max-w-6xl mx-auto p-4 md:p-6">
			<Card className="shadow-lg border-0">
				<CardHeader className="p-6 pb-4 border-b rounded-t-lg border-slate-100">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">
								{project?.userInputs?.businessName ||
									'Project Details'}
							</CardTitle>
						</div>
						<div className="flex items-center gap-2">
							{getStatusBadge()}
							{project?.status === 'generating' && (
								<div className="flex items-center gap-1 text-sm bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
									<RefreshCw className="h-3 w-3 animate-spin" />
									<span>Auto-refreshing</span>
								</div>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-6">
					{project?.status === 'generating' && (
						<div className="flex flex-col items-center justify-center py-12">
							<GeneratingDesignsLoader />
							<p className="mt-6 text-center text-muted-foreground max-w-md">
								We&apos;re creating your design. This process
								typically takes 2-5 minutes.
							</p>
						</div>
					)}

					{project?.status === 'error' && (
						<Alert variant="destructive" className="mb-6">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Generation Failed</AlertTitle>
							<AlertDescription>	
								There was an error generating your design.
								Please try again or contact support if the issue
								persists.
							</AlertDescription>
						</Alert>
					)}

					{project?.status === 'review' && currentDesign && (
						<div className="space-y-6">
							<div className="grid grid-cols-2 gap-6">
								{project.generatedDesignVariations.map(
									(variation, index) => (
										<div
											key={variation.variationId}
											className="space-y-4 p-4 rounded-lg border border-slate-200"
										>
											<h3 className="text-lg font-semibold">
												Design Variation {index + 1}
											</h3>
											<div className="h-[200px]">
												<OBJModelViewer
													objPath="/glb/untitled.obj"
													imageUrl={
														variation.sections[0]
															?.designOutputUrl
													}
												/>
											</div>
											<Button
												onClick={() =>
													router.push(
														`/project/${project._id}/edit/${variation.variationId}`
													)
												}
												className="w-full mt-2"
											>
												Select Variant
											</Button>
										</div>
									)
								)}
							</div>
						</div>
					)}
					</CardContent>

				{project?.status === 'review' && (
					<CardFooter className="flex justify-between border-t p-6 bg-slate-50">
						<Button
							variant="outline"
							onClick={() => router.push('/projects')}
						>
							Back to Projects
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
