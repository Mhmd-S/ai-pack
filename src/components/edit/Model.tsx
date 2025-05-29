import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OBJModelEditProps } from '@/lib/definitions';
import { ThreeEvent } from '@react-three/fiber';
import { useSelect, useCursor, OrbitControls } from '@react-three/drei';
import { useControls } from '@/components/edit/MultiLEva';

// Define a type for the controllable material properties
type ControllableMaterialProps = {
	color?: string;
	roughness?: number;
	thickness?: number;
	envMapIntensity?: number;
	transmission?: number;
	metalness?: number;
};

// Default values for material properties
const defaultMaterialValues: Required<ControllableMaterialProps> = {
	color: '#ff0000', // Default to red
	roughness: 0.5,
	thickness: 1.0,
	envMapIntensity: 1.0,
	transmission: 0.0,
	metalness: 0.0,
};

const Model = ({
	objPath,
	...props // Capture any other potential props from OBJModelEditProps if it has more than objPath
}: OBJModelEditProps) => {
	const [model, setModel] = useState<THREE.Group | null>(null);
	const [hovered, setHover] = useState(false);

	const selectedElements = useSelect();
	const selectedStores = selectedElements.map((sel) => sel.userData.store);

	const [store, materialProps] = useControls(selectedStores, {
		color: { value: defaultMaterialValues.color },
		roughness: { value: defaultMaterialValues.roughness, min: 0, max: 1 },
		thickness: {
			value: defaultMaterialValues.thickness,
			min: -10,
			max: 10,
		},
		envMapIntensity: {
			value: defaultMaterialValues.envMapIntensity,
			min: 0,
			max: 10,
		},
		transmission: {
			value: defaultMaterialValues.transmission,
			min: 0,
			max: 1,
		},
		metalness: { value: defaultMaterialValues.metalness, min: 0, max: 1 },
	}) as [unknown, ControllableMaterialProps];

	useCursor(hovered);

	useEffect(() => {
		if (model && materialProps) {
			model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.material instanceof THREE.MeshStandardMaterial) {
						const mat = child.material;
						for (const key in materialProps) {
							const propKey =
								key as keyof ControllableMaterialProps;
							if (
								propKey in mat &&
								materialProps[propKey] !== undefined
							) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								(mat as any)[propKey] = materialProps[propKey];
							}
						}
						mat.needsUpdate = true;
					}
				}
			});
		}
	}, [model, materialProps]);

	useEffect(() => {
		const loader = new OBJLoader();
		loader.load(
			objPath,
			(object: THREE.Group) => {
				setModel(object);
			},
			undefined, // onProgress callback, can be omitted
			(error: Error) => {
				// Corrected error type
				console.error('Error loading model:', error);
			}
		);
	}, [objPath]);

	if (!model) return null;

	return (
		<>
			<OrbitControls />
			<primitive
				{...props}
				object={model}
				userData={{ store }}
				onPointerOver={(e: ThreeEvent<PointerEvent>) => (
					e.stopPropagation(), setHover(true)
				)} // Typed event
				onPointerOut={() => setHover(false)}
			/>
		</>
	);
};

export default Model;
