'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import OBJModelEdit from '@/components/edit/DesignEdit3D';
import FloatingToolbar from '@/components/edit/FloatingToolbar';
import InstructionsModal from '@/components/edit/InstructionsModal';
import { toast } from 'sonner';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import DraggableText from '@/components/edit/DraggableText';
import * as THREE from 'three';

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
	selectedVariationId?: string;
}

// Define ActiveTool type here for the page state
export type ActiveTool = 'color' | 'measurements' | 'text' | null;

interface TextSettings {
	font: string;
	size: number;
	color: string;
}

interface TextElement {
	id: string;
	text: string;
	position: { x: number; y: number };
	size: { width: number; height: number };
	font: string;
	fontSize: number;
	color: string;
	faceName: string;
}

export default function EditVariationPage() {
	const params = useParams();
	const router = useRouter();
	const { id: projectId, variationId } = params;

	const [project, setProject] = useState<Project | null>(null);
	const [selectedVariation, setSelectedVariation] =
		useState<DesignVariation | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [selectedFace, setSelectedFace] = useState<string | null>(null);

	// New state for the floating toolbar
	const [activeTool, setActiveTool] = useState<ActiveTool>(null);
	const [dropperColor, setDropperColor] = useState<string>('#FFFFFF');

	// New state for measurements (scale)
	const [modelScale, setModelScale] = useState<{
		x: number;
		y: number;
		z: number;
	}>({ x: 1, y: 1, z: 1 });
	const [showInstructionsModal, setShowInstructionsModal] = useState(false);

	const [textElements, setTextElements] = useState<TextElement[]>([]);
	const [textSettings, setTextSettings] = useState<TextSettings>({
		font: 'Arial',
		size: 24,
		color: '#FFFFFF',
	});
	const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

	const fetchProject = useCallback(async () => {
		if (!projectId || !variationId) return;
		setLoading(true);
		try {
			const response = await fetch(`/api/projects/${projectId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch project data');
			}
			const data: Project = await response.json();
			setProject(data);

			const variationToSelect = data.generatedDesignVariations.find(
				(v) => v.variationId === variationId
			);

			if (variationToSelect) {
				setSelectedVariation(variationToSelect);

				// Call the API to mark this variation as selected and remove others
				// We only do this if the variation hasn't been selected yet or if there are multiple variations present
				if (
					data.selectedVariationId !== variationId ||
					data.generatedDesignVariations.length > 1
				) {
					try {
						const selectResponse = await fetch(
							`/api/projects/${projectId}/select-variation`,
							{
								method: 'PATCH',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ variationId }),
							}
						);
						if (!selectResponse.ok) {
							const errorData = await selectResponse.json();
							console.error(
								'Failed to select variation:',
								errorData.message
							);
						} else {
							const updatedProjectData =
								await selectResponse.json();
							// Update the local project state with the potentially modified project from the backend
							// (e.g., if status changed or to ensure consistency)
							setProject(updatedProjectData);
							setSelectedVariation(
								updatedProjectData.generatedDesignVariations.find(
									(v: DesignVariation) =>
										v.variationId === variationId
								)
							);
							console.log(
								'Variation selected and others removed successfully.'
							);
						}
					} catch (selectionError) {
						console.error(
							'Error calling select-variation API:',
							selectionError
						);
					}
				}
			} else {
				setError(
					'Selected design variation not found in project data.'
				);
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

	const handleFaceClick = useCallback(
		(faceName: string) => {
			setSelectedFace(faceName); // Keep track of the last clicked face, might be useful

			if (activeTool === 'color') {
				if (!selectedVariation || !project) return;

				console.log(
					`Applying color ${dropperColor} to face ${faceName} via dropper for variation ${selectedVariation.variationId}`
				);

				const updatedSections = selectedVariation.sections.map(
					(section) => {
						if (section.sectionName === faceName) {
							return {
								...section,
								isSolidColor: true,
								solidColorValue: dropperColor,
								designOutputUrl: undefined,
							};
						}
						return section;
					}
				);

				if (!updatedSections.find((s) => s.sectionName === faceName)) {
					updatedSections.push({
						sectionName: faceName,
						isSolidColor: true,
						solidColorValue: dropperColor,
					});
				}

				const updatedVariation = {
					...selectedVariation,
					sections: updatedSections,
				};
				setSelectedVariation(updatedVariation);

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
			} else {
				// If not in color tool mode, just select the face and update color picker for potential manual edit
				const faceSection = selectedVariation?.sections.find(
					(s) => s.sectionName === faceName
				);
				if (faceSection?.isSolidColor && faceSection.solidColorValue) {
					// When a face is clicked (not in dropper mode), we used to update selectedColor.
					// Now, we just set the dropper color to the face's color if one exists.
					if (activeTool !== ('color' as ActiveTool)) {
						setDropperColor(faceSection.solidColorValue);
					}
				} else {
					if (activeTool !== ('color' as ActiveTool)) {
						setDropperColor('#FFFFFF');
					}
				}
			}
		},
		[
			activeTool,
			dropperColor,
			project,
			selectedVariation,
			setDropperColor,
			setProject,
			setSelectedFace,
			setSelectedVariation,
			variationId,
		]
	);

	const handleDropperColorChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setDropperColor(event.target.value);
	};

	const handleSaveChanges = async () => {
		if (!project || !selectedVariation) {
			toast.error('Cannot Save: No project or variation data to save.');
			return;
		}
		setIsSaving(true);
		try {
			const response = await fetch(
				`/api/projects/${project._id}/update-variation`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						variationId: selectedVariation.variationId,
						sections: selectedVariation.sections,
					}),
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to save changes');
			}
			const updatedProject = await response.json();
			setProject(updatedProject); // Update project state with response
			// Find the updated variation within the updated project to ensure consistency
			const newlySavedVariation =
				updatedProject.generatedDesignVariations.find(
					(v: DesignVariation) =>
						v.variationId === selectedVariation.variationId
				);
			if (newlySavedVariation) setSelectedVariation(newlySavedVariation);
			console.log('Changes saved successfully!');
			toast.success('Your changes have been saved.');
		} catch (err) {
			console.error('Error saving changes:', err);
			toast.error(
				err instanceof Error ? err.message : 'Could not save changes'
			);
		} finally {
			setIsSaving(false);
		}
	};

	const toggleTool = (tool: ActiveTool) => {
		setActiveTool((prev) => (prev === tool ? null : tool));
	};

	const handleScaleChange = (axis: 'x' | 'y' | 'z', value: string) => {
		const numericValue = parseFloat(value);
		if (!isNaN(numericValue)) {
			setModelScale((prevScale) => ({
				...prevScale,
				[axis]: numericValue,
			}));
		}
	};

	// Add text settings handlers
	const handleFontChange = (font: string) => {
		setTextSettings((prev) => ({ ...prev, font }));
		if (selectedTextId) {
			setTextElements((prev) =>
				prev.map((text) =>
					text.id === selectedTextId ? { ...text, font } : text
				)
			);
		}
	};

	const handleSizeChange = (size: number) => {
		setTextSettings((prev) => ({ ...prev, size }));
		if (selectedTextId) {
			setTextElements((prev) =>
				prev.map((text) =>
					text.id === selectedTextId
						? { ...text, fontSize: size }
						: text
				)
			);
		}
	};

	const handleColorChange = (color: string) => {
		setTextSettings((prev) => ({ ...prev, color }));
		if (selectedTextId) {
			setTextElements((prev) =>
				prev.map((text) =>
					text.id === selectedTextId ? { ...text, color } : text
				)
			);
		}
	};

	const handleTextPlace = (
		text: string,
		position: THREE.Vector3,
		settings: TextSettings
	) => {
		if (!selectedFace) {
			toast.error('Please select a face first before adding text');
			return;
		}

		const newTextElement: TextElement = {
			id: Math.random().toString(36).substr(2, 9),
			text,
			position: { x: position.x, y: position.y },
			size: { width: 200, height: 100 },
			font: settings.font,
			fontSize: settings.size,
			color: settings.color,
			faceName: selectedFace,
		};

		setTextElements((prev) => [...prev, newTextElement]);
		setSelectedTextId(newTextElement.id);
	};

	const handleTextUpdate = (id: string, updates: Partial<TextElement>) => {
		setTextElements((prev) =>
			prev.map((text) =>
				text.id === id ? { ...text, ...updates } : text
			)
		);
	};

	const handleTextDelete = (id: string) => {
		setTextElements((prev) => prev.filter((text) => text.id !== id));
		if (selectedTextId === id) {
			setSelectedTextId(null);
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300">
				<div className="w-12 h-12 border-4 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
				<p className="mt-4">Loading Design Editor...</p>
			</div>
		);
	}

	if (error && !isSaving) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300 p-6">
				<Alert
					variant="destructive"
					className="bg-red-800/20 border-red-700 text-red-300 max-w-md w-full"
				>
					<AlertTriangle className="h-5 w-5 text-red-400" />
					<AlertTitle className="text-red-400">Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (!project || !selectedVariation) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300">
				<p>Project or variation data not found.</p>
				<Button
					variant="outline"
					className="mt-4 border-slate-600 hover:bg-slate-700 hover:text-slate-200"
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
		<div className="flex flex-col h-screen bg-slate-800 text-slate-100">
			<SonnerToaster richColors />
			{/* Header Area */}
			<header className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700 shadow-md print:hidden">
				<Button
					onClick={handleSaveChanges}
					disabled={isSaving}
					className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm disabled:opacity-50"
				>
					<Save className="mr-2 h-4 w-4" />
					{isSaving ? 'Saving...' : 'Save All Changes'}
				</Button>
			</header>

			{/* Main Content Area (Viewport + Sidebar) */}
			<div className="flex flex-1 overflow-hidden">
				<FloatingToolbar
					activeTool={activeTool}
					onToggleTool={(tool) => toggleTool(tool as ActiveTool)}
					dropperColor={dropperColor}
					onDropperColorChange={handleDropperColorChange}
					modelScale={modelScale}
					onScaleChange={handleScaleChange}
					onShowInstructions={() => setShowInstructionsModal(true)}
					textSettings={{
						font: textSettings.font,
						size: textSettings.size,
						color: textSettings.color,
						onFontChange: handleFontChange,
						onSizeChange: handleSizeChange,
						onColorChange: handleColorChange,
					}}
				/>

				<InstructionsModal
					isOpen={showInstructionsModal}
					onOpenChange={setShowInstructionsModal}
				/>
				<main className="flex-1 bg-slate-900 overflow-hidden relative">
					<OBJModelEdit
						objPath="/glb/untitled.obj"
						imageUrl={primaryTextureUrl}
						onFaceClick={handleFaceClick}
						faceColors={faceColorMap}
						selectedFaceName={selectedFace || undefined}
						modelScaleX={modelScale.x}
						modelScaleY={modelScale.y}
						modelScaleZ={modelScale.z}
						activeTool={activeTool}
						textSettings={textSettings}
						onTextPlace={handleTextPlace}
					/>
					{/* Text Elements Overlay */}
					{activeTool === 'text' &&
						textElements.map((textElement) => (
							<DraggableText
								key={textElement.id}
								text={textElement}
								isSelected={textElement.id === selectedTextId}
								onSelect={() =>
									setSelectedTextId(textElement.id)
								}
								onUpdate={(updates) =>
									handleTextUpdate(textElement.id, updates)
								}
								onDelete={() =>
									handleTextDelete(textElement.id)
								}
							/>
						))}
					{/* Saving overlay for viewport */}
					{isSaving && (
						<div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
							<div className="flex flex-col items-center gap-2 p-4 bg-slate-800/80 rounded-lg shadow-xl">
								<div className="w-10 h-10 border-4 border-slate-600 border-t-green-500 rounded-full animate-spin"></div>
								<p className="text-sm font-medium text-slate-200">
									Saving changes...
								</p>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
