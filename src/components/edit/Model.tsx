import { useState, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { Select, useSelect } from '@react-three/drei';
import { Panel } from './MultiLeva';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { Object3D } from 'three';
import FaceMesh from '@/components/edit/FaceMesh';

interface ModelProps {
	url: string;
}

// In Model.tsx
const Model = ({ url }: ModelProps) => {
	const [selected, setSelected] = useState<Object3D[]>([]);
	const obj = useLoader(OBJLoader, url);

	const handleSelectionChange = (selectedObjects: Object3D[]) => {
		setSelected(selectedObjects);
	};

	return (
		<>
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
			<Panel selected={selected} />
		</>
	);
};

export default Model;
