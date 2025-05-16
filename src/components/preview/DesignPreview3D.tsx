import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface GLBModelViewerProps {
	glbPath: string;
	imageUrl?: string; // The image to map onto the model
	targetMeshName?: string; // The exact name of the mesh within the GLB to apply the texture to
}

const lightingControls = {
	ambientIntensity: 1.0,
	directionalIntensity: 3.0,
	rimLightIntensity: 1.0,
};

const GLBModelViewer: React.FC<GLBModelViewerProps> = ({
	glbPath,
	imageUrl,
	targetMeshName,
}) => {
	const mountRef = useRef<HTMLDivElement>(null);
	const controlsRef = useRef<OrbitControls | null>(null);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const animationFrameIdRef = useRef<number | undefined>(undefined);
	const loadedTextureRef = useRef<THREE.Texture | null>(null);
	const [isLoading, setIsLoading] = useState(true);


	useEffect(() => {
		if (!mountRef.current || !glbPath) {
			console.log('Mount ref or glbPath not available.');
			return;
		}

		const currentMount = mountRef.current;
		let isMounted = true;

		const scene = new THREE.Scene();
		sceneRef.current = scene;
		scene.background = null;

		const camera = new THREE.PerspectiveCamera(
			45,
			currentMount.clientWidth / currentMount.clientHeight,
			0.1,
			2000
		);
		camera.position.set(0, 2, 4);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
		});
		renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		currentMount.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		const ambientLight = new THREE.AmbientLight(
			0xffffff,
			lightingControls.ambientIntensity * 1.5
		);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(
			0xffffff,
			lightingControls.directionalIntensity
		);
		directionalLight.position.set(2, 4, 2);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.near = 0.5;
		directionalLight.shadow.camera.far = 50;
		scene.add(directionalLight);

		const fillLight = new THREE.DirectionalLight(
			0xffffff,
			lightingControls.directionalIntensity * 0.5
		);
		fillLight.position.set(-2, 2, -2);
		scene.add(fillLight);

		const controls = new OrbitControls(camera, renderer.domElement);
		controlsRef.current = controls;
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.screenSpacePanning = false;
		controls.minDistance = 2;
		controls.maxDistance = 8;
		controls.minPolarAngle = Math.PI / 4;
		controls.maxPolarAngle = Math.PI / 2;
		controls.target.set(0, 0, 0);
		controls.update();

		const textureLoader = new THREE.TextureLoader();
		const gltfLoader = new GLTFLoader();
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/v1/decoders/' // Ensure this path is accessible
		);
		gltfLoader.setDRACOLoader(dracoLoader);

		const loadResources = async () => {
			try {
				setIsLoading(true);
				let texturePromise: Promise<THREE.Texture | null> =
					Promise.resolve(null);
				if (imageUrl && targetMeshName) {
					console.log(
						`Attempting to load texture: ${imageUrl} for target: ${targetMeshName}`
					);
					texturePromise = new Promise((resolve, reject) => {
						textureLoader.load(
							imageUrl,
							(loadedTexture) => {
								loadedTexture.flipY = false;
								loadedTexture.colorSpace = THREE.SRGBColorSpace;
								loadedTextureRef.current = loadedTexture;
								console.log('Texture loaded successfully.');
								resolve(loadedTexture);
							},
							undefined,
							(error) => {
								console.error(
									`Error loading texture: ${imageUrl}`,
									error
								);
								reject(error);
							}
						);
					});
				} else if (imageUrl && !targetMeshName) {
					console.warn(
						'imageUrl provided, but no targetMeshName. Texture will not be applied.'
					);
				}

				console.log(`Attempting to load GLB: ${glbPath}`);
				const gltfPromise = new Promise<THREE.Group>(
					(resolve, reject) => {
						gltfLoader.load(
							glbPath,
							(gltf) => {
								console.log('GLB model loaded successfully.');
								resolve(gltf.scene);
							},
							(xhr) => {
								const progress = (xhr.loaded / xhr.total) * 100;
								if (isMounted) {
									console.log(
										`GLB Loading progress: ${progress.toFixed(
											2
										)}%`
									);
								}
							},
							(error) => {
								console.error(
									'An error happened loading the GLB model:',
									error
								);
								reject(error);
							}
						);
					}
				);

				const [texture, model] = await Promise.all([
					texturePromise,
					gltfPromise,
				]);

				if (!isMounted) return;

				let targetMaterialFound = false;
				model.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.castShadow = true;
						child.receiveShadow = true;

						if (
							texture &&
							targetMeshName &&
							child.name === targetMeshName
						) {
							console.log(
								`Found target mesh: "${child.name}". Applying texture.`
							);
							if (child.material) {
								if (
									child.material instanceof
										THREE.MeshStandardMaterial ||
									child.material instanceof
										THREE.MeshPhysicalMaterial
								) {
									child.material = child.material.clone(); // Clone material
									child.material.map = texture;
									child.material.needsUpdate = true;
									targetMaterialFound = true;
									console.log(
										`Texture applied successfully to "${targetMeshName}".`
									);
								} else {
									console.warn(
										`Target mesh "${targetMeshName}" material is not MeshStandardMaterial or MeshPhysicalMaterial. Type: ${child.material.constructor.name}. Texture map not applied.`
									);
								}
							} else {
								console.warn(
									`Target mesh "${targetMeshName}" has no material. Cannot apply texture.`
								);
							}
						}
					}
				});

				if (texture && targetMeshName && !targetMaterialFound) {
					console.warn(
						`Texture loaded, but target mesh named "${targetMeshName}" was not found or had no suitable material in the GLB.`
					);
				}

				const box = new THREE.Box3().setFromObject(model);
				const center = box.getCenter(new THREE.Vector3());
				const size = box.getSize(new THREE.Vector3());

				model.position.sub(center);

				const maxDim = Math.max(size.x, size.y, size.z);

				camera.position.set(
					0.32,
					1.4,
					1.4
				);
				if (controlsRef.current) {
					controlsRef.current.target.copy(center);
					controlsRef.current.update();
				}
				camera.lookAt(center);
				camera.updateProjectionMatrix();

				scene.add(model);

				const groundSize = Math.max(10, maxDim * 2);
				const groundGeometry = new THREE.PlaneGeometry(
					groundSize,
					groundSize
				);
				const groundMaterial = new THREE.MeshStandardMaterial({
					color: 0x999999,
					roughness: 0.9,
					metalness: 0.1,
				});
				const ground = new THREE.Mesh(groundGeometry, groundMaterial);
				ground.rotation.x = -Math.PI / 2;
				ground.position.y = box.min.y - center.y - 0.01;
				ground.receiveShadow = true;
				scene.add(ground);

				setIsLoading(false);
			} catch (error) {
				if (isMounted) {
					console.error('Failed to load resources:', error);
					setIsLoading(false);
				}
			}
		};

		loadResources();

		const animate = () => {
			if (!isMounted) return;
			animationFrameIdRef.current = requestAnimationFrame(animate);
			if (controlsRef.current) {
				controlsRef.current.update();
			}
			if (rendererRef.current) {
				rendererRef.current.render(scene, camera);
			}
		};
		animate();

		const handleResize = () => {
			if (!isMounted || !currentMount || !rendererRef.current) return;
			const width = currentMount.clientWidth;
			const height = currentMount.clientHeight;

			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			rendererRef.current.setSize(width, height);
		};
		window.addEventListener('resize', handleResize);

		return () => {
			isMounted = false;
			console.log('GLBViewer cleanup initiated.');
			window.removeEventListener('resize', handleResize);
			if (animationFrameIdRef.current) {
				cancelAnimationFrame(animationFrameIdRef.current);
			}
			if (controlsRef.current) {
				controlsRef.current.dispose();
				controlsRef.current = null;
			}
			if (loadedTextureRef.current) {
				loadedTextureRef.current.dispose();
				loadedTextureRef.current = null;
			}
			if (sceneRef.current) {
				sceneRef.current.traverse((object) => {
					if (object instanceof THREE.Mesh) {
						if (object.geometry) object.geometry.dispose();
						if (object.material) {
							if (Array.isArray(object.material)) {
								object.material.forEach((mat) => {
									if (mat.map) mat.map.dispose();
									mat.dispose();
								});
							} else {
								if (
									object.material.map &&
									object.material.map !==
										loadedTextureRef.current
								) {
									object.material.map.dispose();
								}
								object.material.dispose();
							}
						}
					}
				});
				sceneRef.current = null;
			}
			if (rendererRef.current) {
				rendererRef.current.dispose();
				if (
					currentMount &&
					rendererRef.current.domElement.parentNode === currentMount
				) {
					currentMount.removeChild(rendererRef.current.domElement);
				}
				rendererRef.current = null;
			}
			dracoLoader.dispose();
			console.log('GLBViewer cleanup complete.');
		};
	}, [glbPath, imageUrl, targetMeshName, lightingControls]);

	return (
		<div style={{ position: 'relative', width: '100%', height: '200px' }}>
			<div
				ref={mountRef}
				style={{
					width: '100%',
					height: '100%',
					border: '1px solid #ccc',
					borderRadius: '8px',
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

export default GLBModelViewer;
