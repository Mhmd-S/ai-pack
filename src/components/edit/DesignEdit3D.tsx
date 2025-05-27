import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
	OrbitControls,
	useGLTF,
	useTexture,
	Decal,
	Environment,
	PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import { ActiveTool } from './FloatingToolbar';
import { ThreeEvent } from '@react-three/fiber';

// Blender-style highlight colors and effects
const HIGHLIGHT_COLOR = new THREE.Color(0xff8c00); // Blender orange
const DEFAULT_EMISSIVE_COLOR = new THREE.Color(0x000000);
const HIGHLIGHT_OPACITY = 0.3;

interface OBJModelEditProps {
	objPath: string;
	imageUrl?: string;
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
	textElements: Record<string, DesignElement>;
}

// Model component that handles the 3D model and its interactions
const Model = ({
	objPath,
	imageUrl,
	faceColors,
	onFaceClick,
	selectedFaceName,
	textElements,
	modelScaleX,
	modelScaleY,
	modelScaleZ,
	modelRotationX,
	modelRotationY,
	modelRotationZ,
	activeTool,
}: Omit<OBJModelEditProps, 'objPath'> & { objPath: string }) => {
	const modelRef = useRef<THREE.Group>(null);
	const texture = useTexture(imageUrl || '');
	const originalMaterialsRef = useRef<Map<string, THREE.Material>>(new Map());

	// Load the model
	const { nodes } = useGLTF(objPath);

	// Handle model loading and setup
	useEffect(() => {
		if (!modelRef.current) return;

		// Store original materials
		modelRef.current.traverse((child) => {
			if (child instanceof THREE.Mesh && child.name && child.material) {
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

		// Apply initial scale and rotation
		modelRef.current.scale.set(modelScaleX, modelScaleY, modelScaleZ);
		modelRef.current.rotation.set(
			modelRotationX,
			modelRotationY,
			modelRotationZ
		);

		// Center the model
		const box = new THREE.Box3().setFromObject(modelRef.current);
		const center = box.getCenter(new THREE.Vector3());
		modelRef.current.position.sub(center);
	}, [
		objPath,
		modelScaleX,
		modelScaleY,
		modelScaleZ,
		modelRotationX,
		modelRotationY,
		modelRotationZ,
	]);

	// Handle face materials and highlighting
	useEffect(() => {
		if (!modelRef.current) return;

		modelRef.current.traverse((child) => {
			if (child instanceof THREE.Mesh && child.name) {
				const faceName = child.name;
				let material = child.material as THREE.MeshStandardMaterial;

				if (Array.isArray(material)) {
					material = material[0];
				}

				// Apply face color or texture
				if (faceColors[faceName]) {
					material.color.set(faceColors[faceName]);
					material.map = null;
				} else if (faceName === 'top-z' && texture) {
					material.map = texture;
					material.color.set(0xffffff);
				}

				// Apply highlighting
				if (faceName === selectedFaceName && activeTool === null) {
					material.color.lerp(HIGHLIGHT_COLOR, HIGHLIGHT_OPACITY);
					material.emissive.copy(HIGHLIGHT_COLOR);
					material.emissiveIntensity = 0.2;
				} else {
					material.emissive.copy(DEFAULT_EMISSIVE_COLOR);
					material.emissiveIntensity = 0;
				}

				material.needsUpdate = true;
			}
		});
	}, [faceColors, texture, selectedFaceName, activeTool]);

	// Handle click events
	const handleClick = (event: ThreeEvent<MouseEvent>) => {
		event.stopPropagation();
		const faceName = event.object.name;

		if (activeTool === 'text') {
			onFaceClick(faceName);
		} else if (onFaceClick) {
			if (faceName !== selectedFaceName || activeTool === null) {
				onFaceClick(faceName);
			}
		}
	};

	return (
		<group ref={modelRef}>
			{Object.entries(nodes).map(([name, node]) => {
				if (node instanceof THREE.Mesh) {
					return (
						<mesh
							key={name}
							name={name}
							geometry={node.geometry}
							material={node.material}
							onClick={handleClick}
						>
							{textElements[name] &&
								textElements[name].type === 'text' && (
									<Decal
										position={[0, 0, 0.01]}
										rotation={[0, 0, 0]}
										scale={[1, 1, 1]}
									>
										<meshStandardMaterial
											transparent
											polygonOffset
											polygonOffsetFactor={-4}
											map={textElements[name].texture}
										/>
									</Decal>
								)}
						</mesh>
					);
				}
				return null;
			})}
		</group>
	);
};

// Main component
const OBJModelEdit: React.FC<OBJModelEditProps> = (props) => {
	const [isLoading, setIsLoading] = useState(true);

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{
					width: '100%',
					height: '100%',
					background: '#1f2937',
				}}
				onCreated={() => setIsLoading(false)}
			>
				<PerspectiveCamera makeDefault position={[5, 5, 3]} />
				<OrbitControls enableDamping dampingFactor={0.05} />

				<ambientLight intensity={0.8} />
				<directionalLight
					position={[10, 10, 10]}
					intensity={1.2}
					castShadow
				/>
				<directionalLight position={[-10, 10, -10]} intensity={0.7} />
				<directionalLight position={[0, -5, -10]} intensity={0.5} />

				<Environment preset="city" />

				{props.objPath && !isLoading && <Model {...props} />}
			</Canvas>

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
		</div>
	);
};

export default OBJModelEdit;
