import { Canvas } from '@react-three/fiber';
import {
	OrbitControls,
	PerspectiveCamera,
	Environment,
} from '@react-three/drei';
import { OBJModelEditProps } from '@/lib/definitions';
import { useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { Select } from '@react-three/drei';
import { Panel } from './MultiLeva';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { Object3D } from 'three';
import FaceMesh from '@/components/edit/FaceMesh';

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

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{
					width: '100%',
					height: '100%',
					background: '#1f2937',
				}}
				gl={{
					toneMapping: THREE.NoToneMapping
				}}
				dpr={[1, 2]}
				orthographic
				camera={{ position: [-10, 10, 10], zoom: 100 }}
				onCreated={() => setIsLoading(false)}
			>
				<OrbitControls enableDamping dampingFactor={0.05} />
				<pointLight position={[10, 10, 10]} />

				<Environment preset="city" />
				<Select onChangePointerUp={handleSelectionChange}>
					{obj.children.map((child, index) => {
						if (child instanceof THREE.Mesh) {
							return (
								<FaceMesh
									key={index}
									geometry={child.geometry}
									material={child.material}
									position={child.position}
									rotation={child.rotation}
									scale={child.scale}
								/>
							);
						}
						return null;
					})}
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
