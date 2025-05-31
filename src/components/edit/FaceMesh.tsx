// src/components/edit/FaceMesh.tsx
import { useState } from 'react';
import {
	useSelect,
	Edges,
	useCursor,
} from '@react-three/drei';
import { useControls } from '@/components/edit/MultiLeva';
import * as THREE from 'three';
import { rgbToHex } from '@/lib/utils';

interface FaceMeshProps {
	// Required props
	geometry: THREE.BufferGeometry;
	material: THREE.Material;
	position: THREE.Vector3;
	rotation: THREE.Euler;
	scale: THREE.Vector3;

	// Optional props with defaults
	initialColor?: THREE.Color;
	initialMetalness?: number;
	initialRoughness?: number;
	initialEnvMapIntensity?: number;
	initialThickness?: number;
	initialTransmission?: number;

	// Texture and decal props
	texture?: THREE.Texture;
	decal?: {
		texture: THREE.Texture;
		position: THREE.Vector3;
		rotation: THREE.Euler;
		scale: THREE.Vector3;
	};

	// Text decal props
	textDecal?: {
		text: string;
		font: string;
		size: number;
		color: THREE.Color;
		position: THREE.Vector3;
		rotation: THREE.Euler;
		scale: THREE.Vector3;
	};
}

const FaceMesh = ({
	geometry,
	material,
	position,
	rotation,
	scale,
}: FaceMeshProps) => {
	const [hovered, setHover] = useState(false);
	const selected = useSelect().map((sel) => sel.userData.store);

	// Extract material properties with defaults
	const defaultColor = {r: 255, g: 255, b: 255}
	const defaultRoughness =
		(material as THREE.MeshStandardMaterial).roughness || 0.5;
	const defaultMetalness =
		(material as THREE.MeshStandardMaterial).metalness || 0.5;
	const defaultThickness = 0.5;
	const defaultEnvMapIntensity = 1;
	const defaultTransmission = 0.5;

	const [store, materialProps] = useControls(selected, {
		color: { value: defaultColor },
		roughness: { value: defaultRoughness, min: 0, max: 1 },
		thickness: { value: defaultThickness, min: -10, max: 10 },
		envMapIntensity: { value: defaultEnvMapIntensity, min: 0, max: 10 },
		transmission: { value: defaultTransmission, min: 0, max: 1 },
		metalness: { value: defaultMetalness, min: 0, max: 1 },
	});

	const isSelected = !!selected.find((sel) => sel === store);
	useCursor(hovered);

	return (
		<mesh
			geometry={geometry}
			position={position}
			rotation={rotation}
			scale={scale}
			onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
			onPointerOut={() => setHover(false)}
			userData={{ store }}
		>
			<Edges visible={isSelected} lineWidth={3} color="#ff6600" scale={1} renderOrder={1000}>
				<meshBasicMaterial transparent color="#333" depthTest={false} />
			</Edges>
			<meshStandardMaterial
				color={rgbToHex(materialProps?.color)}
			/>
		</mesh>
	);
};

export default FaceMesh;
