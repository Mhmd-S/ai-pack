import { Canvas } from '@react-three/fiber';
import {
	OrbitControls,
	Grid,
	Environment,
	PerspectiveCamera,
	GizmoViewport,
	GizmoHelper,
} from '@react-three/drei';
import { OBJModelEditProps } from '@/lib/definitions';
import { useState, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { Select } from '@react-three/drei';
import { Panel } from './MultiLeva';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Object3D } from 'three';
import FaceMesh from '@/components/edit/FaceMesh';
import FloatingToolbar from './FloatingToolbar';

// Main component
const OBJModelEdit: React.FC<OBJModelEditProps> = ({
	url,
}: {
	url: string;
}) => {
	const obj = useLoader(OBJLoader, url);

	const [isLoading, setIsLoading] = useState(true);
	const [selected, setSelected] = useState<Object3D[]>([]);

	const handleSelectionChange = (selectedObjects: Object3D[]) => {
		setSelected(selectedObjects);
	};

	const locked = useMemo(() => {
		if (!selected && selected?.length == 0) return false;
		return !!selected[0]?.userData?.isDecal;
	}, [selected]);

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{
					width: '100%',
					height: '100%',
					background: '#e5e5e5',
				}}
				dpr={[1, 2]}
				onCreated={() => setIsLoading(false)}
			>
				<PerspectiveCamera
					position={[0, 0, 10]}
					fov={50}
					near={0.1}
					far={1000}
				/>
				<OrbitControls
					target={[0, 0, 0]}
					enableDamping
					dampingFactor={0.05}
					minAzimuthAngle={-Math.PI / 1}
					maxAzimuthAngle={Math.PI / 1}
					minPolarAngle={Math.PI / 6}
					maxPolarAngle={Math.PI - Math.PI / 2}
					maxDistance={100}
					maxZoom={100}
					enableRotate={!locked}
				/>

				<GizmoHelper alignment="bottom-right" margin={[100, 100]}>
					<GizmoViewport labelColor="white" axisHeadScale={1} />
				</GizmoHelper>

				<Grid
					position={[0, -1, 0]} // Adjust position as needed
					args={[500, 500]} // Grid size (width, height)
					cellSize={2}
					cellThickness={1}
					cellColor={'#aeaeae'}
					sectionSize={50}
					sectionThickness={1}
					sectionColor={'#5e5e5e'}
					fadeDistance={25}
					fadeStrength={2}
					followCamera={false}
					infiniteGrid={false}
					fadeFrom={0}
				/>

				<Environment preset="city" />
				<Select onChangePointerUp={handleSelectionChange}>
					{obj.children.map(
						(child: THREE.Object3D, index: number) => {
							if (child instanceof THREE.Mesh) {
								return (
									<FaceMesh
										key={index}
										geometry={child.geometry}
										material={child.material}
									/>
								);
							}
							return null;
						}
					)}
				</Select>
			</Canvas>
			<Panel selected={selected} />

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
