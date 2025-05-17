import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface OBJModelViewerProps {
	objPath: string;
	imageUrl?: string; // Primary texture, e.g., for 'top-z'
	faceColors?: Record<string, string>; // Colors for specific faces
	onFaceClick?: (faceName: string) => void;
}

const OBJModelViewer: React.FC<OBJModelViewerProps> = ({
	objPath,
	imageUrl,
	faceColors = {},
	onFaceClick,
}) => {
	const mountRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const modelRef = useRef<THREE.Group | null>(null); // Ref to store the loaded model

	const applyMaterialToFaces = useCallback(() => {
		if (!modelRef.current) return;

		const textureLoader = new THREE.TextureLoader();
		let sharedTexture: THREE.Texture | null = null;
		let textureLoadPromise = Promise.resolve();

		if (imageUrl) {
			textureLoadPromise = new Promise<void>((resolve, reject) => {
				textureLoader.load(
					imageUrl,
					(loadedTexture) => {
						loadedTexture.flipY = true;
						loadedTexture.colorSpace = THREE.SRGBColorSpace;
						loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
						loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
						loadedTexture.center.set(0.5, 0.5);
						loadedTexture.rotation = Math.PI / 1; // Consider if this rotation is always needed
						sharedTexture = loadedTexture;
						resolve();
					},
					undefined,
					(error) => {
						console.error('Error loading primary texture:', error);
						reject(error);
					}
				);
			});
		}

		textureLoadPromise
			.then(() => {
				modelRef.current?.traverse((child) => {
					if (child instanceof THREE.Mesh && child.material) {
						const faceName = child.name;
						let newMaterial: THREE.Material;

						if (faceColors[faceName]) {
							// Apply solid color
							newMaterial = new THREE.MeshStandardMaterial({
								color: new THREE.Color(faceColors[faceName]),
								side: THREE.DoubleSide,
								transparent: false,
								opacity: 1,
							});
						} else if (faceName === 'top-z' && sharedTexture) {
							// Apply primary texture to 'top-z' if no specific color override
							newMaterial = new THREE.MeshStandardMaterial({
								map: sharedTexture,
								side: THREE.DoubleSide,
								transparent: false, // Ensure this is false if texture has no alpha
								opacity: 1,
							});
						} else {
							// Fallback to original material or a default, ensure it's cloned
							if (Array.isArray(child.material)) {
								// If material is an array, clone the first one as a default
								// This might need more sophisticated handling based on your model
								newMaterial = child.material[0].clone();
							} else {
								newMaterial = child.material.clone();
							}
							// Ensure properties for non-textured/non-colored faces
							(newMaterial as THREE.MeshStandardMaterial).map =
								null;
							(newMaterial as THREE.MeshStandardMaterial).color =
								new THREE.Color(0x808080); // Default grey
						}

						newMaterial.side = THREE.DoubleSide;
						newMaterial.needsUpdate = true;
						child.material = newMaterial;
					}
				});
			})
			.catch((error) =>
				console.error('Error in texture loading promise chain:', error)
			);
	}, [imageUrl, faceColors]);

	useEffect(() => {
		if (!mountRef.current || !objPath) {
			return;
		}

		const currentMount = mountRef.current;
		let isMounted = true;

		sceneRef.current = new THREE.Scene();
		sceneRef.current.background = new THREE.Color(0xf0f0f0);

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

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
		sceneRef.current.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
		directionalLight.position.set(5, 10, 7.5);
		sceneRef.current.add(directionalLight);

		const controls = new OrbitControls(
			cameraRef.current,
			rendererRef.current.domElement
		);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;

		const loader = new OBJLoader();
		loader.load(
			objPath,
			(object) => {
				if (!isMounted || !sceneRef.current) return;

				modelRef.current = object; // Store the model reference
				applyMaterialToFaces(); // Apply initial materials/colors

				const box = new THREE.Box3().setFromObject(object);
				const center = box.getCenter(new THREE.Vector3());
				object.position.sub(center);
				object.rotation.y = Math.PI; // Adjust as needed

				sceneRef.current.add(object);
				setIsLoading(false);
			},
			undefined, // Progress callback (optional)
			(error) => {
				console.error('Error loading OBJ:', error);
				setIsLoading(false);
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

		// Raycasting for face clicks
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		const onClick = (event: MouseEvent) => {
			if (
				!isMounted ||
				!currentMount ||
				!cameraRef.current ||
				!modelRef.current ||
				!onFaceClick
			)
				return;

			// Calculate mouse position in normalized device coordinates (-1 to +1) for both components
			const rect = currentMount.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(mouse, cameraRef.current);
			const intersects = raycaster.intersectObject(
				modelRef.current,
				true
			); // true for recursive

			if (intersects.length > 0) {
				const firstIntersectedObject = intersects[0].object;
				if (firstIntersectedObject instanceof THREE.Mesh) {
					console.log('Clicked face:', firstIntersectedObject.name);
					onFaceClick(firstIntersectedObject.name); // Pass the mesh name
				}
			}
		};

		if (onFaceClick) {
			currentMount.addEventListener('click', onClick);
		}

		return () => {
			isMounted = false;
			window.removeEventListener('resize', handleResize);
			if (onFaceClick) {
				currentMount.removeEventListener('click', onClick);
			}
			if (
				currentMount &&
				rendererRef.current?.domElement.parentNode === currentMount
			) {
				currentMount.removeChild(rendererRef.current.domElement);
			}
			rendererRef.current?.dispose();
			// Dispose materials and geometries if necessary
			modelRef.current?.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
					if (Array.isArray(child.material)) {
						child.material.forEach((material) =>
							material.dispose()
						);
					} else {
						child.material.dispose();
					}
				}
			});
			sceneRef.current = null;
			cameraRef.current = null;
			rendererRef.current = null;
			modelRef.current = null;
		};
	}, [objPath]); // Only re-run if objPath changes. imageUrl and faceColors are handled by applyMaterialToFaces

	// Effect to re-apply materials when faceColors or imageUrl changes
	useEffect(() => {
		applyMaterialToFaces();
	}, [faceColors, imageUrl, applyMaterialToFaces]);

	return (
		<div
			style={{
				position: 'relative',
				width: '100%',
				height: '100%' /* Ensure parent has height */,
			}}
		>
			<div
				ref={mountRef}
				style={{
					width: '100%',
					height: '100%',
					// border: '1px solid #ccc', // Optional: Keep or remove based on preference
					// borderRadius: '8px',
					overflow: 'hidden',
					position: 'relative',
				}}
			/>
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-3">
						<div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
						<p className="text-sm font-medium text-slate-600">
							Loading preview...
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default OBJModelViewer;
