import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ActiveTool } from './FloatingToolbar';

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

interface TextElement {
	id: string;
	text: string;
	position: { x: number; y: number };
	rotation: { x: number; y: number; z: number };
	size: { width: number; height: number };
	font: string;
	fontSize: number;
	color: string;
	faceName: string;
}

interface OBJModelEditProps {
	objPath: string;
	imageUrl?: string; // Primary texture, e.g., for 'top-z'
	faceColors: Record<string, string>;
	onFaceClick: (faceName: string) => void;
	selectedFaceName?: string;
	modelScaleX: number;
	modelScaleY: number;
	modelScaleZ: number;
	modelRotationX: number;
	modelRotationY: number;
	modelRotationZ: number;
	activeTool: ActiveTool;
	textElements: TextElement[];
}

const OBJModelEdit: React.FC<OBJModelEditProps> = ({
	objPath,
	imageUrl,
	faceColors,
	onFaceClick,
	selectedFaceName,
	modelScaleX,
	modelScaleY,
	modelScaleZ,
	modelRotationX,
	modelRotationY,
	modelRotationZ,
	activeTool,
	textElements,
}) => {
	const mountRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showNoFacePopup, setShowNoFacePopup] = useState(false);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const modelRef = useRef<THREE.Group | null>(null);
	const originalMaterialsRef = useRef<Map<string, THREE.Material>>(new Map());
	const borderMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

	// Function to create border mesh which is used for the higlighting of face
	const createBorderMesh = (mesh: THREE.Mesh) => {
		// Copy the geometry of the mesh so we can use it to create a new mesh
		const borderGeometry = mesh.geometry.clone();

		// Create a new group to hold the border mesh. We don't need a group but it makes it more extensible and easier to manage if we need to add extra effects(meshes) or different faces but we would need to make the group a state.
		const borderGroup = new THREE.Group();

		// Create the border material, this is used to create the border mesh
		const borderMaterial = new THREE.MeshBasicMaterial({
			color: BORDER_COLOR,
			side: THREE.BackSide,
			transparent: true,
			opacity: 0.5,
		});

		// Create the border mesh, material + geometry = mesh
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
	};

	// Function to update border meshes
	const updateBorderMeshes = () => {
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
	};

	const applyMaterialToFaces = () => {
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
	};

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

		// Clear the scene and model - remove the old model and reset the materials
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

		// Load the new model
		loader.load(
			objPath,
			(object) => {
				// Mounted means we have a valid scene, renderer, camera, and mount, so all is left to add is the model
				if (!isMounted || !sceneRef.current) return;
				modelRef.current = object;

				// We are going to go through each mesh inside the object,
				// This is so we can apply the same material to the same face when we load the new model
				// This is because the materials are not stored in the object itself, but in the scene
				// So we need to store the materials in a map so we can apply the same material to the same face
				// when we load the new model
				// FYI A mesh is a single face of the model with a geometry and a material
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
					modelRef.current.rotation.set(
						modelRotationX,
						modelRotationY,
						modelRotationZ
					);
				}

				// Creating a bounding box around the object and then centering it
				// A bounding box is a geometrical shape that surrounds the object, generally, the reason we use bounding boxes is because models can be complex and have many faces but bounding boxes are simple shapes that encloses a model and gives us infomration of the size of the model, location, and orientation.
				const box = new THREE.Box3().setFromObject(object);

				// Getting the center of the bounding box
				const center = box.getCenter(new THREE.Vector3());
				// Subtracting the center from the object's position to center the object
				object.position.sub(center);
				// Adding the object to the scene
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

		// Clean up function
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
	}, [
		faceColors,
		imageUrl,
		selectedFaceName,
		activeTool,
		applyMaterialToFaces,
	]);

	// Effect to handle model scaling dynamically after initial load
	useEffect(() => {
		if (modelRef.current) {
			modelRef.current.scale.set(modelScaleX, modelScaleY, modelScaleZ);
			modelRef.current.rotation.set(
				modelRotationX,
				modelRotationY,
				modelRotationZ
			);
		}
	}, [
		modelScaleX,
		modelScaleY,
		modelScaleZ,
		modelRotationX,
		modelRotationY,
		modelRotationZ,
	]);

	// Modify click handler
	useEffect(() => {
		const currentMount = mountRef.current;
		const currentModel = modelRef.current;
		const currentCamera = cameraRef.current;

		if (isLoading || !currentMount || !currentModel || !currentCamera) {
			return;
		}

		// Raycaster is a class that is used to cast rays from the camera to the scene
		// It is used to check if the user has clicked on a face of the model
		// It is also used to check if the user is dragging the model
		// Helps with mouse picking ( Working out what objects in a 3D space the mouse is over)
		const raycaster = new THREE.Raycaster();
		// Mouse is a vector2 that is used to store the position of the mouse (x,y), works in tandem with raycaster object
		const mouse = new THREE.Vector2();

		let lastClickTime = 0;
		let isDragging = false;
		let dragStartTime = 0;

		const CLICK_DELAY = 300; // Minimum time between clicks in milliseconds
		const DRAG_THRESHOLD = 200; // Time threshold to consider as drag (ms)

		// Will hold the position of the mouse when the user starts dragging
		const dragStartPosition = new THREE.Vector2();

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

			const intersects = raycaster.intersectObjects(meshes, true);

			if (intersects.length > 0) {
				const firstIntersectedObject = intersects[0].object;
				if (
					firstIntersectedObject instanceof THREE.Mesh &&
					firstIntersectedObject.name
				) {
					if (activeTool === 'text') {
						// When text tool is active, show text modal immediately
						if (onFaceClick) {
							onFaceClick(firstIntersectedObject.name);
						}
					} else if (onFaceClick) {
						if (
							firstIntersectedObject.name !== selectedFaceName ||
							activeTool === null
						) {
							onFaceClick(firstIntersectedObject.name);

							// If no tool is active, align camera to the face
							if (activeTool === null && cameraRef.current) {
								const faceNormal = new THREE.Vector3();
								const faceCenter = new THREE.Vector3();

								// Get the face normal at the intersection point
								const faceIndex = intersects[0].faceIndex;

								if (
									faceIndex !== undefined &&
									faceIndex !== null
								) {
									// Get the face normal using computeVertexNormals
									const geometry =
										firstIntersectedObject.geometry;
									geometry.computeVertexNormals();
									const normalAttribute =
										geometry.getAttribute('normal');
									const normalX = normalAttribute.getX(
										faceIndex * 3
									);
									const normalY = normalAttribute.getY(
										faceIndex * 3
									);
									const normalZ = normalAttribute.getZ(
										faceIndex * 3
									);
									faceNormal.set(normalX, normalY, normalZ);
									faceNormal.applyMatrix4(
										firstIntersectedObject.matrixWorld
									);
									faceNormal.normalize();

									// Calculate face center
									const positionAttribute =
										geometry.getAttribute('position');
									const vertices = [];

									// Get the three vertices of the intersected face
									for (let i = 0; i < 3; i++) {
										const vertexIndex = geometry.index
											? geometry.index.getX(
													faceIndex * 3 + i
											  )
											: faceIndex * 3 + i;
										const x =
											positionAttribute.getX(vertexIndex);
										const y =
											positionAttribute.getY(vertexIndex);
										const z =
											positionAttribute.getZ(vertexIndex);
										vertices.push(
											new THREE.Vector3(x, y, z)
										);
									}

									// Calculate center of the face
									faceCenter
										.addVectors(vertices[0], vertices[1])
										.add(vertices[2])
										.multiplyScalar(1 / 3);

									// Transform to world space
									faceCenter.applyMatrix4(
										firstIntersectedObject.matrixWorld
									);

									// Get the bounding box of the model
									const box = new THREE.Box3().setFromObject(
										modelRef.current
									);
									const boxSize = new THREE.Vector3();
									box.getSize(boxSize);

									// Determine which face was clicked based on the face name
									const faceName =
										firstIntersectedObject.name;
									const cameraDirection = new THREE.Vector3();


									// Simple mapping of face names to camera directions
									if (faceName.includes('top-z')) {
										cameraDirection.set(cameraDirection.x, 1, cameraDirection.z); // Look from top
									} else if (faceName.includes('bot-z')) {
										cameraDirection.set(cameraDirection.x, -1, cameraDirection.z); // Look from bottom
									} else if (faceName.includes('-f')) {
										cameraDirection.set(-1, 0, 0); // Look from front
									} else if (faceName.includes('-b')) {
										cameraDirection.set(1, 0, 0); // Look from back
									} else if (faceName.includes('-l')) {
										cameraDirection.set(0, 0, -1); // Look from left
									} else if (faceName.includes('-r')) {
										cameraDirection.set(0, 0, 1); // Look from right
									}

									// Calculate new camera position
									const distance =
										Math.max(
											boxSize.x,
											boxSize.y,
											boxSize.z
										) * 2; // Scale distance based on model size
									const newCameraPosition = faceCenter
										.clone()
										.add(
											cameraDirection.multiplyScalar(
												distance
											)
										);

									// Animate camera movement
									const startPosition =
										cameraRef.current.position.clone();

									// Calculate target rotation to look at face center
									const targetLookAt = faceCenter.clone();
									const targetPosition = newCameraPosition;

									// Animate over 500ms
									const duration = 500;
									const startTime = Date.now();

									const animateCamera = () => {
										if (!cameraRef.current) return;

										const elapsed = Date.now() - startTime;
										const progress = Math.min(
											elapsed / duration,
											1
										);

										// Ease in-out function
										const easeProgress =
											progress < 0.5
												? 2 * progress * progress
												: 1 -
												  Math.pow(
														-2 * progress + 2,
														2
												  ) /
														2;

										// Interpolate position
										cameraRef.current.position.lerpVectors(
											startPosition,
											targetPosition,
											easeProgress
										);

										// Update look at
										cameraRef.current.lookAt(targetLookAt);

										if (progress < 1) {
											requestAnimationFrame(
												animateCamera
											);
										}
									};

									animateCamera();
								}
							}
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
	}, [onFaceClick, isLoading, activeTool, selectedFaceName]);

	// Update border meshes when selected face changes or tool changes
	useEffect(() => {
		updateBorderMeshes();
	}, [selectedFaceName, activeTool, updateBorderMeshes]);

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

	// Add text rendering function
	const renderTextOnFace = useCallback(
		(face: THREE.Mesh, textElement: TextElement) => {
			if (!sceneRef.current) return;

			// Create a canvas for text rendering
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			if (!context) return;

			// Set canvas size based on text size
			canvas.width = textElement.size.width;
			canvas.height = textElement.size.height;

			// Configure text style
			context.font = `${textElement.fontSize}px ${textElement.font}`;
			context.fillStyle = textElement.color;
			context.textAlign = 'center';
			context.textBaseline = 'middle';

			// Draw text
			context.fillText(
				textElement.text,
				canvas.width / 2,
				canvas.height / 2
			);

			// Create texture from canvas
			const texture = new THREE.CanvasTexture(canvas);
			texture.needsUpdate = true;

			// Create material with text texture
			const material = new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				side: THREE.DoubleSide,
			});

			// Create plane for text
			const plane = new THREE.Mesh(
				new THREE.PlaneGeometry(1, 1),
				material
			);

			// Create a group to hold both the face and text
			const group = new THREE.Group();

			// Add the face to the group if it's not already in one
			if (face.parent) {
				face.parent.remove(face);
			}
			group.add(face);

			// Position and rotate the text plane relative to the face
			plane.position.set(0, 0, 0.01); // Slightly offset from face to prevent z-fighting
			plane.scale.set(
				textElement.size.width / 100,
				textElement.size.height / 100,
				1
			);

			// Add text plane to the group
			group.add(plane);

			// Add the group to the scene
			sceneRef.current.add(group);

			return plane;
		},
		[]
	);

	// Update text rendering when text elements change
	useEffect(() => {
		if (!modelRef.current || !sceneRef.current) return;

		// Remove existing text planes
		sceneRef.current.children.forEach((child) => {
			if (child.userData.isTextPlane) {
				sceneRef.current?.remove(child);
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					if (child.material instanceof THREE.Material) {
						child.material.dispose();
					}
				}
			}
		});

		// Render new text elements
		textElements.forEach((textElement) => {
			modelRef.current?.traverse((child) => {
				if (
					child instanceof THREE.Mesh &&
					child.name === textElement.faceName
				) {
					const textPlane = renderTextOnFace(child, textElement);
					if (textPlane) {
						textPlane.userData.isTextPlane = true;
					}
				}
			});
		});
	}, [textElements, renderTextOnFace]);

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
		</div>
	);
};

export default OBJModelEdit;
