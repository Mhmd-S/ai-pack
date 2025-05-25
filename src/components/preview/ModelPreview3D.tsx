import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelPreviewProps {
	objPath: string;
	faceColors?: Record<string, string>;
}

const ModelPreview: React.FC<ModelPreviewProps> = ({
	objPath,
	faceColors = {},
}) => {
	const mountRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const modelRef = useRef<THREE.Group | null>(null);

	const applyMaterialToFaces = () => {
		if (!modelRef.current) return;

		modelRef.current.traverse((child) => {
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
				} else {
					// Default material
					newMaterial = new THREE.MeshStandardMaterial({
						color: new THREE.Color(0x808080), // Default grey
						side: THREE.DoubleSide,
						transparent: false,
						opacity: 1,
					});
				}

				newMaterial.side = THREE.DoubleSide;
				newMaterial.needsUpdate = true;
				child.material = newMaterial;
			}
		});
	};

	useEffect(() => {
		if (!mountRef.current || !objPath) return;

		const currentMount = mountRef.current;
		let isMounted = true;

		// Initialize scene
		sceneRef.current = new THREE.Scene();
		sceneRef.current.background = new THREE.Color(0xf0f0f0);

		// Initialize camera
		cameraRef.current = new THREE.PerspectiveCamera(
			50,
			currentMount.clientWidth / currentMount.clientHeight,
			0.1,
			1000
		);
		cameraRef.current.position.set(5, 5, 3);

		// Initialize renderer
		rendererRef.current = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
		});
		rendererRef.current.setSize(
			currentMount.clientWidth,
			currentMount.clientHeight
		);
		rendererRef.current.setPixelRatio(window.devicePixelRatio);
		currentMount.appendChild(rendererRef.current.domElement);

		// Add lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
		sceneRef.current.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
		directionalLight.position.set(5, 10, 7.5);
		sceneRef.current.add(directionalLight);

		// Add controls
		const controls = new OrbitControls(
			cameraRef.current,
			rendererRef.current.domElement
		);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.enableZoom = true;
		controls.autoRotate = true;
		controls.autoRotateSpeed = 1;

		// Load model
		const loader = new OBJLoader();
		loader.load(
			objPath,
			(object) => {
				if (!isMounted || !sceneRef.current) return;

				modelRef.current = object;
				applyMaterialToFaces();

				// Center and scale model
				const box = new THREE.Box3().setFromObject(object);
				const center = box.getCenter(new THREE.Vector3());
				const size = box.getSize(new THREE.Vector3());
				const maxDim = Math.max(size.x, size.y, size.z);
				const scale = 2 / maxDim;

				object.position.sub(center);
				object.scale.multiplyScalar(scale);
				object.rotation.y = Math.PI;

				sceneRef.current.add(object);
				setIsLoading(false);
			},
			undefined,
			(error) => {
				console.error('Error loading OBJ:', error);
				setIsLoading(false);
			}
		);

		// Animation loop
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

		// Handle resize
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

		// Cleanup
		return () => {
			isMounted = false;
			window.removeEventListener('resize', handleResize);
			if (
				currentMount &&
				rendererRef.current?.domElement.parentNode === currentMount
			) {
				currentMount.removeChild(rendererRef.current.domElement);
			}
			rendererRef.current?.dispose();
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
	}, [objPath]);

	// Update materials when faceColors change
	useEffect(() => {
		applyMaterialToFaces();
	}, [faceColors]);

	return (
		<div className="relative w-full h-full">
			<div
				ref={mountRef}
				className="w-full h-full overflow-hidden rounded-lg"
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

export default ModelPreview;
