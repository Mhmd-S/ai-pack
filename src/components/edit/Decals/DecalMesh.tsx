import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface DecalMeshProps {
	position: [number, number, number];
	scale: [number, number];
	isSelected: boolean;
	isHovered: boolean;
	store: any;
	rotation: [number, number, number];
	onPointerOver: (e: THREE.Event) => void;
	onPointerOut: () => void;
	onPointerDown?: () => void;
}

const DecalMesh = ({
	position,
	scale,
	isSelected,
	isHovered,
	store,
	rotation,
	onPointerDown,
	onPointerOver,
	onPointerOut,
}: DecalMeshProps) => {
	return (
		<mesh
			position={[position[0], position[1], position[2]]}
			rotation={new THREE.Euler(rotation[0],rotation[1], rotation[2])}
			onPointerOver={onPointerOver}
			onPointerOut={onPointerOut}
			userData={{ store, isDecal: true }}
			onPointerDown={(e) => {
				// e.stopPropagation();
				onPointerDown?.();
			}}
			onPointerUp={(e) => {
				e.stopPropagation();
			}}
		>
			<planeGeometry args={scale} />
			<meshBasicMaterial transparent opacity={0.1} color="hotpink" />

			{/* Selected state edges */}
			<Edges
				visible={isSelected}
				lineWidth={3}
				color="#ff6600"
				scale={1}
				renderOrder={1000}
			>
				<meshBasicMaterial transparent color="#333" depthTest={false} />
			</Edges>

			{/* Hovered state edges */}
			<Edges
				visible={isHovered && !isSelected}
				lineWidth={3}
				color="#5c5c5c"
				scale={1}
				renderOrder={1000}
			>
				<meshBasicMaterial transparent color="#333" depthTest={false} />
			</Edges>
		</mesh>
	);
};

export default DecalMesh;
