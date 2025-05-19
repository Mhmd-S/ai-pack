import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

// Blender-style highlight colors and effects
const HIGHLIGHT_COLOR = new THREE.Color(0xff8c00); // Blender orange
const BORDER_COLOR = new THREE.Color(0xffa500); // Slightly brighter orange for border
const DEFAULT_EMISSIVE_COLOR = new THREE.Color(0x000000);
const HIGHLIGHT_OPACITY = 0.3;
const BORDER_THICKNESS = 0.02; // Thickness of the border effect

interface MaterialWithColor extends THREE.Material {
	color?: THREE.Color;
	map?: THREE.Texture | null;
	emissive?: THREE.Color;
}

interface TextSettings {
	font: string;
	size: number;
	color: string;
}

interface OBJModelEditProps {
	objPath: string;
	imageUrl?: string; // Primary texture, e.g., for 'top-z'
	faceColors?: Record<string, string>; // Colors for specific faces
	onFaceClick?: (faceName: string) => void;
	selectedFaceName?: string; // New prop for highlighting
	modelScaleX?: number;
	modelScaleY?: number;
	modelScaleZ?: number;
	activeTool?: 'color' | 'measurements' | 'text' | null;
	textSettings?: TextSettings;
	onTextPlace?: (
		text: string,
		position: THREE.Vector3,
		settings: TextSettings
	) => void;
}

const OBJModelEdit: React.FC<OBJModelEditProps> = ({
	objPath,
	imageUrl,
	faceColors = {},
	onFaceClick,
	selectedFaceName,
	modelScaleX = 1,
	modelScaleY = 1,
	modelScaleZ = 1,
	activeTool,
	textSettings,
	onTextPlace,
}) => {
	const mountRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showNoFacePopup, setShowNoFacePopup] = useState(false);
	const [textInput, setTextInput] = useState('');
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const modelRef = useRef<THREE.Group | null>(null);
	const originalMaterialsRef = useRef<Map<string, THREE.Material>>(new Map());
	const borderMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

	// Function to create border mesh
	const createBorderMesh = useCallback((mesh: THREE.Mesh) => {
		const borderGeometry = mesh.geometry.clone();

		// Create a new group to hold the border mesh
		const borderGroup = new THREE.Group();

		// Create the border mesh
		const borderMaterial = new THREE.MeshBasicMaterial({
			color: BORDER_COLOR,
			side: THREE.BackSide,
			transparent: true,
			opacity: 0.5,
		});

		const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);

		// Scale the border mesh slightly larger
		const scale = 1 + BORDER_THICKNESS;
		borderMesh.scale.set(scale, scale, scale);

		// Add the border mesh to the group
		borderGroup.add(borderMesh);

		// Copy the original mesh's transformations
		borderGroup.position.copy(mesh.position);
		borderGroup.rotation.copy(mesh.rotation);
		borderGroup.scale.copy(mesh.scale);

		// If the original mesh has a parent, add the border group to the same parent
		if (mesh.parent) {
			mesh.parent.add(borderGroup);
		}

		return borderGroup;
	}, []);

	// Function to update border meshes
	const updateBorderMeshes = useCallback(() => {
		if (!modelRef.current || !sceneRef.current) return;

		// Remove all existing border meshes
		borderMeshesRef.current.forEach((mesh) => {
			if (mesh.parent) {
				mesh.parent.remove(mesh);
			}
			mesh.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					if (child.material instanceof THREE.Material) {
						child.material.dispose();
					} else if (Array.isArray(child.material)) {
						child.material.forEach((m) => m.dispose());
					}
				}
			});
		});
		borderMeshesRef.current.clear();

		// Add border mesh for selected face
		if (selectedFaceName) {
			modelRef.current.traverse((child) => {
				if (
					child instanceof THREE.Mesh &&
					child.name === selectedFaceName
				) {
					const borderGroup = createBorderMesh(child);
					borderGroup.name = `${child.name}_border`;
					borderMeshesRef.current.set(child.name, borderGroup);
				}
			});
		}
	}, [selectedFaceName, createBorderMesh]);

	const applyMaterialToFaces = useCallback(() => {
		if (!modelRef.current) return;

		const textureLoader = new THREE.TextureLoader();
		let texturePromise: Promise<THREE.Texture | null> =
			Promise.resolve(null);

		if (imageUrl) {
			texturePromise = new Promise<THREE.Texture | null>(
				(resolve, reject) => {
					textureLoader.load(
						imageUrl,
						(loadedTexture) => {
							loadedTexture.flipY = false;
							loadedTexture.colorSpace = THREE.SRGBColorSpace;
							resolve(loadedTexture);
						},
						undefined,
						(error) => {
							console.error(
								'Error loading primary texture:',
								error
							);
							reject(error);
						}
					);
				}
			);
		}

		texturePromise
			.then((loadedSharedTexture) => {
				modelRef.current?.traverse((child) => {
					if (child instanceof THREE.Mesh && child.name) {
						const faceName = child.name;
						let originalMaterial =
							originalMaterialsRef.current.get(faceName);

						if (!originalMaterial) {
							const currentMat = child.material as
								| THREE.Material
								| THREE.Material[]
								| undefined;
							const matToClone = Array.isArray(currentMat)
								? currentMat[0]
								: currentMat;

							let newCreatedMaterial: THREE.Material;
							if (
								matToClone &&
								typeof matToClone.clone === 'function'
							) {
								newCreatedMaterial = matToClone.clone();
							} else {
								newCreatedMaterial =
									new THREE.MeshStandardMaterial({
										color: 0xcccccc,
									});
							}
							originalMaterial = newCreatedMaterial;
							originalMaterialsRef.current.set(
								faceName,
								newCreatedMaterial
							);
						}

						let newMaterial: THREE.MeshStandardMaterial;
						if (
							originalMaterial instanceof
							THREE.MeshStandardMaterial
						) {
							newMaterial = originalMaterial.clone();
						} else {
							if (originalMaterial) {
								const matProps: {
									color?: THREE.Color;
									map?: THREE.Texture | null;
									side?: THREE.Side;
								} = {};
								if (
									(originalMaterial as MaterialWithColor)
										.color
								) {
									matProps.color = (
										originalMaterial as MaterialWithColor
									).color?.clone();
								}
								if (
									(originalMaterial as MaterialWithColor).map
								) {
									matProps.map = (
										originalMaterial as MaterialWithColor
									).map;
								}
								matProps.side =
									originalMaterial.side !== undefined
										? originalMaterial.side
										: THREE.DoubleSide;
								newMaterial = new THREE.MeshStandardMaterial(
									matProps
								);
							} else {
								console.warn(
									`OBJModelEdit: originalMaterial was undefined for face ${faceName} when expected. Creating a default material.`
								);
								newMaterial = new THREE.MeshStandardMaterial({
									color: 0xff00ff,
									side: THREE.DoubleSide,
								});
							}
						}

						newMaterial.side = THREE.DoubleSide;
						newMaterial.transparent = true;
						newMaterial.opacity = 1;

						const faceSpecificColor = faceColors[faceName];
						const isTopZ = faceName === 'top-z';

						if (faceSpecificColor) {
							newMaterial.color.set(faceSpecificColor);
							newMaterial.map = null;
						} else if (isTopZ && loadedSharedTexture) {
							newMaterial.map = loadedSharedTexture;
							newMaterial.color.set(0xffffff);
						} else {
							if (
								newMaterial.map === loadedSharedTexture &&
								!isTopZ
							) {
								newMaterial.map = null;
							}
						}

						// Only show highlight in select mode
						if (
							faceName === selectedFaceName &&
							activeTool === null
						) {
							// Blender-style highlight
							newMaterial.color.lerp(
								HIGHLIGHT_COLOR,
								HIGHLIGHT_OPACITY
							);
							newMaterial.emissive.copy(HIGHLIGHT_COLOR);
							newMaterial.emissiveIntensity = 0.2;
						} else {
							newMaterial.emissive.copy(DEFAULT_EMISSIVE_COLOR);
							newMaterial.emissiveIntensity = 0;
						}

						child.material = newMaterial;
						newMaterial.needsUpdate = true;
					}
				});

				// Only update border meshes in select mode
				if (activeTool === null) {
					updateBorderMeshes();
				} else {
					// Remove border meshes when not in select mode
					borderMeshesRef.current.forEach((mesh) => {
						if (mesh.parent) {
							mesh.parent.remove(mesh);
						}
						mesh.traverse((child) => {
							if (child instanceof THREE.Mesh) {
								child.geometry.dispose();
								if (child.material instanceof THREE.Material) {
									child.material.dispose();
								} else if (Array.isArray(child.material)) {
									child.material.forEach((m) => m.dispose());
								}
							}
						});
					});
					borderMeshesRef.current.clear();
				}
			})
			.catch((error) =>
				console.error(
					'Error processing materials after texture load:',
					error
				)
			);
	}, [
		imageUrl,
		faceColors,
		selectedFaceName,
		activeTool,
		updateBorderMeshes,
	]);

	// Main useEffect for scene setup, model loading, and core WebGL elements
	useEffect(() => {
		if (!mountRef.current || !objPath) return;
		const currentMount = mountRef.current;
		let isMounted = true;

		sceneRef.current = new THREE.Scene();
		cameraRef.current = new THREE.PerspectiveCamera(
			50,
			currentMount.clientWidth / currentMount.clientHeight,
			0.1,
			1000
		);
		cameraRef.current.position.set(5, 5, 3);

		rendererRef.current = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			preserveDrawingBuffer: true,
		});
		rendererRef.current.setSize(
			currentMount.clientWidth,
			currentMount.clientHeight
		);
		rendererRef.current.setPixelRatio(window.devicePixelRatio);
		currentMount.appendChild(rendererRef.current.domElement);

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Slightly reduced ambient
		sceneRef.current.add(ambientLight);

		// Main directional light (e.g., from top-right-front)
		const mainDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
		mainDirectionalLight.position.set(10, 10, 10);
		mainDirectionalLight.castShadow = true; // Optional: for shadow casting
		sceneRef.current.add(mainDirectionalLight);

		// Fill light from another angle (e.g., top-left-rear)
		const fillDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
		fillDirectionalLight.position.set(-10, 10, -10);
		sceneRef.current.add(fillDirectionalLight);

		// Back light to give some rim highlighting (e.g., from bottom-back)
		const backDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		backDirectionalLight.position.set(0, -5, -10);
		sceneRef.current.add(backDirectionalLight);

		const controls = new OrbitControls(
			cameraRef.current,
			rendererRef.current.domElement
		);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;

		const loader = new OBJLoader();
		setIsLoading(true);
		if (modelRef.current && sceneRef.current) {
			sceneRef.current.remove(modelRef.current);
			modelRef.current.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					if (Array.isArray(child.material)) {
						child.material.forEach((m) => m.dispose());
					} else {
						child.material.dispose();
					}
				}
			});
		}
		originalMaterialsRef.current.clear();

		loader.load(
			objPath,
			(object) => {
				if (!isMounted || !sceneRef.current) return;
				modelRef.current = object;

				object.traverse((child) => {
					if (
						child instanceof THREE.Mesh &&
						child.name &&
						child.material
					) {
						const matToStore = Array.isArray(child.material)
							? child.material[0]
							: child.material;
						if (matToStore) {
							originalMaterialsRef.current.set(
								child.name,
								matToStore.clone()
							);
						}
					}
				});

				applyMaterialToFaces(); // Apply materials once after load

				if (modelRef.current) {
					modelRef.current.scale.set(
						modelScaleX,
						modelScaleY,
						modelScaleZ
					);
				}

				const box = new THREE.Box3().setFromObject(object);
				const center = box.getCenter(new THREE.Vector3());
				object.position.sub(center);
				sceneRef.current.add(object);
				setIsLoading(false);
			},
			undefined,
			(error) => {
				console.error('Error loading OBJ:', error);
				setIsLoading(false); // Ensure loading is false on error
			}
		);

		const animate = () => {
			if (
				!isMounted ||
				!rendererRef.current ||
				!sceneRef.current ||
				!cameraRef.current
			)
				return;
			requestAnimationFrame(animate);
			controls.update();
			rendererRef.current.render(sceneRef.current, cameraRef.current);
		};
		animate();

		const handleResize = () => {
			if (
				!isMounted ||
				!currentMount ||
				!rendererRef.current ||
				!cameraRef.current
			)
				return;
			const width = currentMount.clientWidth;
			const height = currentMount.clientHeight;
			cameraRef.current.aspect = width / height;
			cameraRef.current.updateProjectionMatrix();
			rendererRef.current.setSize(width, height);
		};
		window.addEventListener('resize', handleResize);

		return () => {
			isMounted = false;
			window.removeEventListener('resize', handleResize);

			if (modelRef.current && sceneRef.current) {
				sceneRef.current.remove(modelRef.current);
				modelRef.current.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.geometry.dispose();
						const material = child.material as
							| THREE.Material
							| THREE.Material[];
						if (Array.isArray(material)) {
							material.forEach((m) => m.dispose());
						} else if (material) {
							material.dispose();
						}
					}
				});
			}
			originalMaterialsRef.current.forEach((material) =>
				material.dispose()
			);
			originalMaterialsRef.current.clear();
			rendererRef.current?.dispose();
			sceneRef.current?.clear();

			if (
				currentMount &&
				rendererRef.current?.domElement.parentNode === currentMount
			) {
				currentMount.removeChild(rendererRef.current.domElement);
			}

			sceneRef.current = null;
			cameraRef.current = null;
			rendererRef.current = null;
			modelRef.current = null;
		};
	}, [objPath]); // Main effect now only depends on objPath

	// Moved from above: useEffect for applying materials when relevant props change
	useEffect(() => {
		if (modelRef.current) {
			applyMaterialToFaces();
		}
	}, [faceColors, imageUrl, selectedFaceName, applyMaterialToFaces]);

	// Effect to handle model scaling dynamically after initial load
	useEffect(() => {
		if (modelRef.current) {
			modelRef.current.scale.set(modelScaleX, modelScaleY, modelScaleZ);
		}
	}, [modelScaleX, modelScaleY, modelScaleZ]);

	// Add new function to handle text placement
	const handleTextPlacement = useCallback(
		(position: THREE.Vector3) => {
			if (!selectedFaceName) {
				setShowNoFacePopup(true);
				return;
			}

			if (!textSettings || !onTextPlace) return;

			onTextPlace(textInput, position, textSettings);
			setTextInput('');
		},
		[selectedFaceName, textSettings, onTextPlace, textInput]
	);

	// Modify click handler to handle text placement
	useEffect(() => {
		const currentMount = mountRef.current;
		const currentModel = modelRef.current;
		const currentCamera = cameraRef.current;

		if (isLoading || !currentMount || !currentModel || !currentCamera) {
			return;
		}

		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		let lastClickTime = 0;
		const CLICK_DELAY = 300; // Minimum time between clicks in milliseconds
		let isDragging = false;
		let dragStartTime = 0;
		const DRAG_THRESHOLD = 200; // Time threshold to consider as drag (ms)
		let dragStartPosition = new THREE.Vector2();

		const handlePointerDown = (event: MouseEvent) => {
			if (!mountRef.current) return;
			isDragging = false;
			dragStartTime = Date.now();
			const rect = mountRef.current.getBoundingClientRect();
			dragStartPosition.set(
				((event.clientX - rect.left) / rect.width) * 2 - 1,
				-((event.clientY - rect.top) / rect.height) * 2 + 1
			);
		};

		const handlePointerMove = (event: MouseEvent) => {
			if (!mountRef.current) return;
			const rect = mountRef.current.getBoundingClientRect();
			const currentPosition = new THREE.Vector2(
				((event.clientX - rect.left) / rect.width) * 2 - 1,
				-((event.clientY - rect.top) / rect.height) * 2 + 1
			);

			// If we've moved more than a small threshold, consider it a drag
			if (dragStartPosition.distanceTo(currentPosition) > 0.01) {
				isDragging = true;
			}
		};

		const handleClick = (event: MouseEvent) => {
			if (!mountRef.current || !cameraRef.current || !modelRef.current)
				return;

			// Prevent rapid-fire clicks
			const now = Date.now();
			if (now - lastClickTime < CLICK_DELAY) return;
			lastClickTime = now;

			// If this was a drag operation, don't process the click
			if (isDragging || now - dragStartTime > DRAG_THRESHOLD) {
				return;
			}

			const rect = mountRef.current.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			// Update the raycaster
			raycaster.setFromCamera(mouse, cameraRef.current);

			// Get all meshes in the model
			const meshes: THREE.Mesh[] = [];
			modelRef.current.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					meshes.push(child);
				}
			});

			// Find intersections with all meshes
			const intersects = raycaster.intersectObjects(meshes, true);

			if (intersects.length > 0) {
				const firstIntersectedObject = intersects[0].object;
				if (
					firstIntersectedObject instanceof THREE.Mesh &&
					firstIntersectedObject.name
				) {
					if (activeTool === 'text') {
						handleTextPlacement(intersects[0].point);
					} else if (onFaceClick) {
						// Only trigger face click if it's a different face
						if (firstIntersectedObject.name !== selectedFaceName) {
							onFaceClick(firstIntersectedObject.name);
						}
					}
				}
			}
		};

		// Add event listeners for drag detection
		currentMount.addEventListener('pointerdown', handlePointerDown);
		currentMount.addEventListener('pointermove', handlePointerMove);
		currentMount.addEventListener('click', handleClick);

		return () => {
			if (currentMount) {
				currentMount.removeEventListener(
					'pointerdown',
					handlePointerDown
				);
				currentMount.removeEventListener(
					'pointermove',
					handlePointerMove
				);
				currentMount.removeEventListener('click', handleClick);
			}
		};
	}, [
		onFaceClick,
		isLoading,
		activeTool,
		handleTextPlacement,
		selectedFaceName,
	]);

	// Update border meshes when selected face changes
	useEffect(() => {
		updateBorderMeshes();
	}, [selectedFaceName, updateBorderMeshes]);

	// Clean up border meshes on unmount
	useEffect(() => {
		return () => {
			borderMeshesRef.current.forEach((mesh) => {
				if (mesh.parent) {
					mesh.parent.remove(mesh);
				}
				mesh.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.geometry.dispose();
						if (child.material instanceof THREE.Material) {
							child.material.dispose();
						} else if (Array.isArray(child.material)) {
							child.material.forEach((m) => m.dispose());
						}
					}
				});
			});
			borderMeshesRef.current.clear();
		};
	}, []);
	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<div
				ref={mountRef}
				style={{
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					position: 'relative',
					background: '#1f2937',
				}}
			/>
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
					<div className="flex flex-col items-center gap-3 p-4 bg-slate-800/80 rounded-lg shadow-xl">
						<div className="w-8 h-8 border-4 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
						<p className="text-sm font-medium text-slate-200">
							Loading Preview...
						</p>
					</div>
				</div>
			)}
			{showNoFacePopup && (
				<div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
					<div className="flex flex-col items-center gap-3 p-4 bg-slate-800/80 rounded-lg shadow-xl">
						<p className="text-sm font-medium text-slate-200">
							Please select a face first before adding text
						</p>
						<button
							onClick={() => setShowNoFacePopup(false)}
							className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
						>
							OK
						</button>
					</div>
				</div>
			)}
			{activeTool === 'text' && (
				<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
					<div className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg shadow-xl">
						<input
							type="text"
							value={textInput}
							onChange={(e) => setTextInput(e.target.value)}
							placeholder="Enter text..."
							className="px-3 py-1 bg-slate-700 text-slate-200 rounded border border-slate-600 focus:border-violet-500 focus:outline-none"
						/>
						<button
							onClick={() => {
								if (selectedFaceName) {
									// Place text at center of view
									const center = new THREE.Vector3();
									if (modelRef.current) {
										const box =
											new THREE.Box3().setFromObject(
												modelRef.current
											);
										box.getCenter(center);
									}
									handleTextPlacement(center);
								} else {
									setShowNoFacePopup(true);
								}
							}}
							className="px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
						>
							Place Text
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default OBJModelEdit;
