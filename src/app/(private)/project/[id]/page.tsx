'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Save, Package } from 'lucide-react';
import OBJModelEdit from '@/components/edit/DesignEdit3D';
import FloatingToolbar, { ActiveTool } from '@/components/edit/FloatingToolbar';
import InstructionsModal from '@/components/edit/InstructionsModal';
import TextInputModal from '@/components/edit/TextInputModal';
import { toast } from 'sonner';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { IModelProperties } from '@/lib/definitions';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

type PackagingObject = {
	id: string;
	name: string;
	path: string;
};

const AVAILABLE_OBJECTS: PackagingObject[] = [
	{ id: 'clamshell', name: 'Clamshell Box', path: '/models/clamshell.obj' },
	{ id: 'burger', name: 'Burger Box', path: '/models/burger.obj' },
	{ id: 'custom', name: 'Custom Box', path: '/models/custom.obj' },
];

interface Project {
	_id?: string;
	status: 'draft' | 'generating' | 'review' | 'error';
	model: IModelProperties;
}

export default function ProjectPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();

	const projectIdFromPath = params.id as string;

	const [project, setProject] = useState<Project | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [selectedFace, setSelectedFace] = useState<string | null>(null);
	const [selectedObject, setSelectedObject] = useState<string>(
		AVAILABLE_OBJECTS[0].id
	);

	// State for the floating toolbar
	const [activeTool, setActiveTool] = useState<ActiveTool>(null);
	const [dropperColor, setDropperColor] = useState<string>('#FFFFFF');

	// State for measurements (scale)
	const [modelScale, setModelScale] = useState<{
		x: number;
		y: number;
		z: number;
	}>({ x: 1, y: 1, z: 1 });

	const [modelRotation, setModelRotation] = useState<{
		x: number;
		y: number;
		z: number;
	}>({ x: 0, y: 0, z: 0 });

	const [showInstructionsModal, setShowInstructionsModal] = useState(false);
	const [showTextModal, setShowTextModal] = useState(false);

	const isNewProject = useMemo(
		() => projectIdFromPath === 'new',
		[projectIdFromPath]
	);

	const initializeNewProject = useCallback(
		(modelTypeFromQuery: string) => {
			const initialModel = AVAILABLE_OBJECTS.find(
				(obj) => obj.id === modelTypeFromQuery
			);
			if (!initialModel) {
				setError(`Invalid model type: ${modelTypeFromQuery}`);
				setLoading(false);
				toast.error(
					`Cannot create project with model type: ${modelTypeFromQuery}`
				);
				router.push('/project');
				return;
			}

			setProject({
				status: 'draft',
				model: {
					modelType: initialModel.id,
					modelPath: initialModel.path,
					scale: { x: 1, y: 1, z: 1 },
					rotation: { x: 0, y: 0, z: 0 },
					faces: [],
				},
			});
			setSelectedObject(initialModel.id);
			setModelScale({ x: 1, y: 1, z: 1 });
			setModelRotation({ x: 0, y: 0, z: 0 });
			setLoading(false);
		},
		[router]
	);

	const fetchProject = useCallback(async () => {
		if (isNewProject) {
			const modelTypeFromQuery = searchParams.get('modelType');
			if (modelTypeFromQuery) {
				initializeNewProject(modelTypeFromQuery);
			} else {
				setError('No model type specified for new project.');
				setLoading(false);
				toast.error('Missing model type for new project.');
				router.push('/project');
			}
			return;
		}

		setLoading(true);
		try {
			const response = await fetch(`/api/projects/${projectIdFromPath}`);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				setError(
					errorData.error ||
						`Failed to fetch project data (status: ${response.status})`
				);
				toast.error(errorData.error || 'Failed to load project.');
				setLoading(false);
				return;
			}
			const data = await response.json();
			setProject(data);

			if (data.model) {
				setSelectedObject(data.model.modelType);
				setModelScale(data.model.scale || { x: 1, y: 1, z: 1 });
				setModelRotation(data.model.rotation || { x: 0, y: 0, z: 0 });
			}
		} catch (err) {
			console.error('Fetch project error:', err);
			setError(
				err instanceof Error
					? err.message
					: 'An unexpected error occurred while loading project data'
			);
			toast.error('Failed to load project data.');
		} finally {
			setLoading(false);
		}
	}, [
		projectIdFromPath,
		isNewProject,
		searchParams,
		router,
		initializeNewProject,
	]);

	useEffect(() => {
		fetchProject();
	}, [fetchProject]);

	const handleObjectChange = async (value: string) => {
		if (!AVAILABLE_OBJECTS) {
			toast.error('Object list not available');
			return;
		}

		const selectedObj = AVAILABLE_OBJECTS.find((obj) => obj.id === value);
		if (!selectedObj) {
			toast.error('Invalid object selected');
			return;
		}

		setSelectedObject(value);
		if (!project) return;

		const updatedModelProperties: IModelProperties = {
			...project.model,
			modelType: value,
			modelPath: selectedObj.path,
		};

		if (isNewProject || !project._id) {
			setProject({
				...project,
				model: updatedModelProperties,
			});
			toast.info(
				`Model changed to ${selectedObj.name}. Save to persist.`
			);
			return;
		}

		try {
			setIsSaving(true);
			const response = await fetch(`/api/projects/${project._id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: updatedModelProperties }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || 'Failed to update model type on server'
				);
			}

			const updatedProject = await response.json();
			setProject(updatedProject);
			toast.success('Model type updated successfully on server');
		} catch (err) {
			console.error('Error updating model type:', err);
			toast.error(
				err instanceof Error
					? err.message
					: 'Failed to update model type'
			);
			setSelectedObject(
				project.model?.modelType || AVAILABLE_OBJECTS[0].id
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleFaceClick = useCallback(
		(faceName: string) => {
			setSelectedFace(faceName);
			if (!project) return;

			const currentFaces = project.model.faces || [];

			if (activeTool === 'color') {
				handleFaceColor(faceName);
			} else if (activeTool === 'design') {
				toast.info(
					'Design upload functionality coming soon. Save your project first.'
				);
			} else {
				const face = currentFaces.find((f) => f.faceName === faceName);
				if (face?.isSolidColor && face.solidColorValue) {
					setDropperColor(face.solidColorValue);
				} else {
					setDropperColor('#FFFFFF');
				}
			}
		},
		[activeTool, dropperColor, project]
	);

	const handleDropperColorChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setDropperColor(event.target.value);
	};

	const handleSaveChanges = async () => {
		if (!project) {
			toast.error('Cannot Save: No project data available.');
			return;
		}
		setIsSaving(true);

		const projectPayload: Omit<Project, '_id'> & { _id?: string } = {
			...project,
			status: project.status || 'draft',
			model: {
				...project.model,
				scale: modelScale,
				rotation: modelRotation,
			},
		};
		if (isNewProject || !projectPayload._id) {
			delete projectPayload._id;
		}

		try {
			let response;
			let newProjectId = project._id;

			if (isNewProject || !project._id) {
				response = await fetch('/api/projects', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(projectPayload),
				});
			} else {
				response = await fetch(`/api/projects/${project._id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(projectPayload),
				});
			}

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || 'Failed to save changes to server'
				);
			}

			const savedProject = await response.json();
			setProject(savedProject);

			if ((isNewProject || !project._id) && savedProject._id) {
				newProjectId = savedProject._id;
				router.replace(`/project/${newProjectId}`, { scroll: false });
				toast.success('Project created and saved successfully!');
			} else {
				toast.success('Your changes have been saved.');
			}
		} catch (err) {
			console.error('Error saving changes:', err);
			toast.error(
				err instanceof Error ? err.message : 'Could not save changes'
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleSetTool = (tool: ActiveTool) => {
		if (activeTool === tool) {
			setActiveTool(null);
		} else {
			setActiveTool(tool);
		}
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

	const handleRotationChange = (axis: 'x' | 'y' | 'z', value: string) => {
		const numericValue = parseFloat(value);
		if (!isNaN(numericValue)) {
			setModelRotation((prevRotation) => ({
				...prevRotation,
				[axis]: numericValue,
			}));
		}
	};

	const handleFaceColor = (faceName: string) => {
		if (!project) return;
		const currentFaces = project.model.faces || [];
		const faceExists = currentFaces.some((f) => f.faceName === faceName);

		let updatedFaces;
		if (faceExists) {
			updatedFaces = currentFaces.map((face) => {
				if (face.faceName === faceName) {
					return {
						...face,
						isSolidColor: true,
						solidColorValue: dropperColor,
						designUrl: undefined,
						texture: undefined,
					};
				}
				return face;
			});
		} else {
			updatedFaces = [
				...currentFaces,
				{
					faceName,
					isSolidColor: true,
					solidColorValue: dropperColor,
				},
			];
		}

		setProject({
			...project,
			model: {
				...project.model,
				faces: updatedFaces,
			},
		});
	};

	const handleTextSubmit = (text: string) => {
		setSelectedFace(selectedFace);
		if (!project) return;

		const currentFaces = project.model.faces || [];

		if (!selectedFace) return;

		const faceExists = currentFaces.some(
			(f) => f.faceName === selectedFace
		);

		let updatedFaces;
		if (faceExists) {
			updatedFaces = currentFaces.map((face) => {
				if (face.faceName === selectedFace) {
					return {
						...face,
						designElements: [
							...(face.designElements || []),
							{
								type: 'text',
								content: { text },
								position: { x: 0, y: 0, z: 0 },
								scale: { x: 1, y: 1, z: 1 },
								style: {
									color: '#000000',
									fontFamily: 'Arial',
								},
							},
						],
					};
				}
				return face;
			});
		} else {
			updatedFaces = [
				...currentFaces,
				{
					faceName: selectedFace,
					isSolidColor: false,
					designElements: [{ type: 'text', content: { text }, position: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, style: { color: '#000000', fontFamily: 'Arial' } }],
				},
			];
		}

		setProject({
			...project,
			model: {
				...project.model,
				faces: updatedFaces,
			},
		});
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

	if (!project && !loading && !error) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300">
				<p>Project data could not be initialized.</p>
				<Button
					variant="outline"
					className="mt-4 border-slate-600 hover:bg-slate-700 hover:text-slate-200"
					onClick={() => router.push('/project')}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Model Selection
				</Button>
			</div>
		);
	}

	if (!project) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300">
				<p>Loading or an error occurred. Please try again.</p>
				<Button
					variant="outline"
					onClick={() => router.push('/project')}
				>
					Back to selection
				</Button>
			</div>
		);
	}

	const faceColorMap = project.model.faces.reduce<Record<string, string>>(
		(acc, face) => {
			if (face.isSolidColor && face.solidColorValue) {
				acc[face.faceName] = face.solidColorValue;
			}
			return acc;
		},
		{}
	);

	const textElements = project.model.faces.reduce<Record<string, DesignElement>>(
		(acc, face) => {
			if (face.designElements) {
				face.designElements.forEach((element) => {
					if (element.type == 'text') {
						acc[element.faceName] = element;
					}
				});
			}
			return acc;
		},
		{}
	);

	const selectedObjectPath =
		AVAILABLE_OBJECTS?.find((obj) => obj.id === selectedObject)?.path ||
		AVAILABLE_OBJECTS[0].path;

	return (
		<div className="flex flex-col h-screen bg-slate-800 text-slate-100">
			<SonnerToaster richColors />
			{/* Header Area */}
			<header className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700 shadow-md print:hidden">
				<div className="flex items-center gap-4">
					{AVAILABLE_OBJECTS && (
						<Select
							value={selectedObject}
							onValueChange={handleObjectChange}
						>
							<SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
								<Package className="mr-2 h-4 w-4" />
								<SelectValue placeholder="Select object" />
							</SelectTrigger>
							<SelectContent>
								{AVAILABLE_OBJECTS.map((obj) => (
									<SelectItem key={obj.id} value={obj.id}>
										{obj.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Button
						onClick={handleSaveChanges}
						disabled={isSaving || !project}
						className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-sm disabled:opacity-50"
					>
						<Save className="mr-2 h-4 w-4" />
						{isSaving
							? 'Saving...'
							: isNewProject || !project._id
							? 'Create & Save Project'
							: 'Save Changes'}
					</Button>
				</div>
			</header>

			{/* Main Content Area (Viewport + Sidebar) */}
			<div className="flex flex-1 overflow-hidden">
				<FloatingToolbar
					activeTool={activeTool}
					onSetTool={handleSetTool}
					dropperColor={dropperColor}
					onDropperColorChange={handleDropperColorChange}
					modelScale={modelScale}
					onScaleChange={handleScaleChange}
					modelRotation={modelRotation}
					onRotationChange={handleRotationChange}
					onShowInstructions={() => setShowInstructionsModal(true)}
					isFaceSelected={selectedFace !== null}
					setShowTextModal={setShowTextModal}
				/>

				<InstructionsModal
					isOpen={showInstructionsModal}
					onOpenChange={setShowInstructionsModal}
				/>
				<TextInputModal
					isOpen={showTextModal}
					onClose={() => setShowTextModal(false)}
					onSubmit={handleTextSubmit}
				/>
				<main className="flex-1 bg-slate-900 overflow-hidden relative">
					<OBJModelEdit
						objPath={selectedObjectPath}
						onFaceClick={handleFaceClick}
						faceColors={faceColorMap}
						textElements={textElements}
						selectedFaceName={selectedFace || undefined}
						modelScaleX={modelScale.x}
						modelScaleY={modelScale.y}
						modelScaleZ={modelScale.z}
						modelRotationX={modelRotation.x}
						modelRotationY={modelRotation.y}
						modelRotationZ={modelRotation.z}
						activeTool={activeTool}

					/>
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
