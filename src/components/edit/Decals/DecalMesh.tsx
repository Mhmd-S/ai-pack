import { Edges } from '@react-three/drei';
import * as THREE from 'three';

interface DecalMeshProps {
	position: [number, number, number];
	scale: [number, number];
	isSelected: boolean;
	isHovered: boolean;
	store: any;
	rotation: number;
	onPointerOver: (e: THREE.Event) => void;
	onPointerOut: () => void;
}

const DecalMesh = ({
	position,
	scale,
	isSelected,
	isHovered,
	store,
	rotation,
	onPointerOver,
	onPointerOut,
}: DecalMeshProps) => {
	return (
		<mesh
			position={[position[0], position[1], position[2] + 0.02]}
			rotation={new THREE.Euler(0,0, rotation)}
			onPointerOver={onPointerOver}
			onPointerOut={onPointerOut}
			userData={{ store, isDecal: true }}
			
		>
			<planeGeometry args={scale} />
			<meshBasicMaterial transparent opacity={0.3} />

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
