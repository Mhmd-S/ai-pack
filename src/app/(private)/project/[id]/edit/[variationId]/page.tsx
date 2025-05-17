'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { AlertTriangle, ArrowLeft, Palette, Save } from 'lucide-react';
import OBJModelViewer from '@/components/preview/DesignPreview3D'; // Ensure this path is correct
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'; // For face selection
import { Input } from '@/components/ui/input'; // For color input

// Mirror the Project and Variation interfaces from the project page
interface Section {
	sectionName: string;
	designOutputUrl?: string;
	isSolidColor: boolean;
	solidColorValue?: string;
}

interface DesignVariation {
	variationId: string;
	sections: Section[];
}

interface Project {
	_id: string;
	status: 'generating' | 'review' | 'error';
	userInputs: {
		businessName: string;
	};
	generatedDesignVariations: DesignVariation[];
}

const FACE_NAMES = [
	'top-f',
	'top-l',
	'top-r',
	'top-z',
	'top-b',
	'bot-f',
	'bot-l',
	'bot-r',
	'bot-z',
	'bot-b',
];

export default function EditVariationPage() {
	const params = useParams();
	const router = useRouter();
	const { id: projectId, variationId } = params;

	const [project, setProject] = useState<Project | null>(null);
	const [selectedVariation, setSelectedVariation] =
		useState<DesignVariation | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedFace, setSelectedFace] = useState<string | null>(null);
	const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF'); // Default to white

	const fetchProject = useCallback(async () => {
		if (!projectId) return;
		setLoading(true);
		try {
			const response = await fetch(`/api/projects/${projectId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch project data');
			}
			const data: Project = await response.json();
			setProject(data);

			const variation = data.generatedDesignVariations.find(
				(v) => v.variationId === variationId
			);
			if (variation) {
				setSelectedVariation(variation);
			} else {
				setError('Selected design variation not found.');
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load project data'
			);
		} finally {
			setLoading(false);
		}
	}, [projectId, variationId]);

	useEffect(() => {
		fetchProject();
	}, [fetchProject]);

	const handleFaceSelect = (faceName: string) => {
		setSelectedFace(faceName);
		// Potentially find existing color for this face from variation data
		const faceSection = selectedVariation?.sections.find(
			(s) => s.sectionName === faceName
		);
		if (faceSection?.isSolidColor && faceSection.solidColorValue) {
			setSelectedColor(faceSection.solidColorValue);
		} else {
			setSelectedColor('#FFFFFF'); // Reset if no color defined or not a solid color
		}
	};

	const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedColor(event.target.value);
	};

	const handleApplyColor = async () => {
		if (!selectedFace || !selectedVariation || !project) return;

		// Here you would typically update the backend with the new color for the selected face
		console.log(
			`Applying color ${selectedColor} to face ${selectedFace} for variation ${selectedVariation.variationId}`
		);
		// For now, we'll update the local state to reflect the change
		// This is a placeholder for actual backend update and re-fetch or optimistic update
		const updatedSections = selectedVariation.sections.map((section) => {
			if (section.sectionName === selectedFace) {
				return {
					...section,
					isSolidColor: true,
					solidColorValue: selectedColor,
					designOutputUrl: undefined,
				};
			}
			return section;
		});

		// If the face wasn't in sections, add it (this logic might need refinement based on backend)
		if (!updatedSections.find((s) => s.sectionName === selectedFace)) {
			updatedSections.push({
				sectionName: selectedFace,
				isSolidColor: true,
				solidColorValue: selectedColor,
			});
		}

		const updatedVariation = {
			...selectedVariation,
			sections: updatedSections,
		};
		setSelectedVariation(updatedVariation);

		// Update the project state as well
		if (project) {
			const updatedProjectVariations =
				project.generatedDesignVariations.map((v) =>
					v.variationId === variationId ? updatedVariation : v
				);
			setProject({
				...project,
				generatedDesignVariations: updatedProjectVariations,
			});
		}

		// Placeholder for API call to save changes
		// try {
		//     const response = await fetch(`/api/projects/${projectId}/variations/${variationId}`, {
		//         method: 'PATCH', // or PUT
		//         headers: { 'Content-Type': 'application/json' },
		//         body: JSON.stringify({ updatedSections }),
		//     });
		//     if (!response.ok) throw new Error('Failed to save changes');
		//     // Optionally re-fetch project or update state based on response
		//     alert('Changes saved!');
		// } catch (err) {
		//     setError(err instanceof Error ? err.message : 'Could not save changes');
		// }
		alert(
			`Color ${selectedColor} applied to ${selectedFace}. Remember to implement saving!`
		);
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6">
				<div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
				<p className="mt-4 text-muted-foreground">
					Loading design editor...
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
				<Button
					onClick={() =>
						router.push(
							projectId ? `/project/${projectId}` : '/projects'
						)
					}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Project
				</Button>
			</div>
		);
	}

	if (!project || !selectedVariation) {
		return (
			<div className="max-w-4xl mx-auto p-6 text-center">
				<p>Project or variation not found.</p>
				<Button
					onClick={() =>
						router.push(
							projectId ? `/project/${projectId}` : '/projects'
						)
					}
					className="mt-4"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Project
				</Button>
			</div>
		);
	}

	// Find the primary design URL for the OBJ viewer (e.g., the 'top-z' texture or a default)
	// This logic might need to be more sophisticated based on your data structure
	const primaryTextureUrl = selectedVariation.sections.find(
		(s) => s.sectionName === 'top-z' && s.designOutputUrl
	)?.designOutputUrl;

	const faceColorMap = selectedVariation.sections.reduce((acc, section) => {
		if (section.isSolidColor && section.solidColorValue) {
			acc[section.sectionName] = section.solidColorValue;
		}
		return acc;
	}, {} as Record<string, string>);

	return (
		<div className="max-w-6xl mx-auto p-4 md:p-6">
			<Card className="shadow-lg border-0">
				<CardHeader className="p-6 pb-4 border-b">
					<div className="flex items-center justify-between">
						<CardTitle className="text-2xl font-bold">
							Edit Design: {project.userInputs.businessName} -
							Variation{' '}
							{selectedVariation.variationId.substring(0, 6)}...
						</CardTitle>
						<Button
							variant="outline"
							onClick={() =>
								router.push(`/project/${project._id}`)
							}
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Project
						</Button>
					</div>
				</CardHeader>

				<CardContent className="p-6 grid md:grid-cols-3 gap-6">
					<div className="md:col-span-2">
						<h3 className="text-lg font-semibold mb-2">
							3D Preview
						</h3>
						<div className="h-[400px] border rounded-lg overflow-hidden">
							{/*
                                TODO: Pass selectedFace and selectedColor to OBJModelViewer
                                and a method to update them from clicks within the viewer.
                                Also, OBJModelViewer needs to be able to apply colors to specific faces.
                            */}
							<OBJModelViewer
								objPath="/glb/untitled.obj" // This should ideally come from project data if variable
								imageUrl={primaryTextureUrl} // Pass the primary texture
								onFaceClick={handleFaceSelect}
								faceColors={faceColorMap}
							/>
						</div>
					</div>

					<div className="space-y-6">
						<div>
							<h3 className="text-lg font-semibold mb-2 flex items-center">
								<Palette className="mr-2 h-5 w-5 text-violet-600" />
								Customize Faces
							</h3>
							<div className="p-4 border rounded-lg bg-slate-50">
								<div className="mb-4 space-y-1">
									<label
										htmlFor="face-select"
										className="text-sm font-medium text-slate-700"
									>
										Select Face
									</label>
									<Select
										onValueChange={handleFaceSelect}
										value={selectedFace || ''}
									>
										<SelectTrigger id="face-select">
											<SelectValue placeholder="Choose a face" />
										</SelectTrigger>
										<SelectContent>
											{FACE_NAMES.map((face) => (
												<SelectItem
													key={face}
													value={face}
												>
													{face}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{selectedFace && (
									<div className="space-y-3">
										<div className="space-y-1">
											<label
												htmlFor="color-picker"
												className="text-sm font-medium text-slate-700"
											>
												Color for{' '}
												<span className="font-semibold">
													{selectedFace}
												</span>
											</label>
											<Input
												id="color-picker"
												type="color"
												value={selectedColor}
												onChange={handleColorChange}
												className="w-full h-10 p-1"
											/>
										</div>
										<Button
											onClick={handleApplyColor}
											className="w-full bg-violet-600 hover:bg-violet-700"
										>
											Apply Color to {selectedFace}
										</Button>
									</div>
								)}
							</div>
						</div>
						<Button className="w-full bg-green-600 hover:bg-green-700">
							<Save className="mr-2 h-4 w-4" />
							Save All Changes
						</Button>
					</div>
				</CardContent>
				<CardFooter className="p-6 border-t text-sm text-muted-foreground">
					<p>
						Click on a face in the preview or select from the
						dropdown to change its color. Remember to save your
						changes.
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}
