import {
	Decal,
	useTexture,
	useSelect,
	useCursor,
	Edges,
	DragControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { useState, useRef } from 'react';
import { useControlsDecals } from '../MultiLeva';

interface ImageDecalProps {
	url: string;
	parentGeometry: THREE.BufferGeometry;
	meshRef: React.RefObject<THREE.Mesh>;
}

const ImageDecal = ({ url, parentGeometry, meshRef }: ImageDecalProps) => {
	const handleRef = useRef<THREE.Mesh>(null);

	const [hovered, setHover] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [initialScale, setInitialScale] = useState<[number, number]>([1, 1]);
	const [initialHandlePosition, setInitialHandlePosition] =
		useState<THREE.Vector3>(new THREE.Vector3());

	const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

	const [store, materialProps, set] = useControlsDecals(
		selectedUserDataStores,
		{
			position: {
				value: [
					parentGeometry?.boundingSphere?.center?.x || 0,
					parentGeometry?.boundingSphere?.center?.y || 0,
					parentGeometry?.boundingSphere?.center?.z || 0,
				],
			},
			scale: {
				value: [1, 1],
			},
		}
	);

	useCursor(hovered);
	const texture = useTexture(url);

	const isSelected = !!selectedUserDataStores.find((s) => s === store);

	// Get current scale or default to [1, 1]
	const currentScale = materialProps.scale || [1, 1];

	// Position for bottom-right corner handle
	const handlePosition: [number, number, number] = [
		materialProps.position[0] + currentScale[0] / 2,
		materialProps.position[1] - currentScale[1] / 2,
		materialProps.position[2] + 0.02,
	];

	// Handle drag start
	const handleDragStart = () => {
		setIsDragging(true);
		setInitialScale([...currentScale]);
		setInitialHandlePosition(new THREE.Vector3(...handlePosition));
	};

	// Handle drag
	// Handle drag
	const handleDrag = (
		localMatrix: THREE.Matrix4,
		deltaLocalMatrix: THREE.Matrix4,
		worldMatrix: THREE.Matrix4,
		deltaWorldMatrix: THREE.Matrix4
	) => {
		if (!isDragging) return;

		// Extract position from the world matrix
		const currentPosition = new THREE.Vector3();
		worldMatrix.decompose(
			currentPosition,
			new THREE.Quaternion(),
			new THREE.Vector3()
		);

		const deltaX = currentPosition.x - initialHandlePosition.x;
		const deltaY = currentPosition.y - initialHandlePosition.y;

		// Calculate new scale based on handle movement
		// For bottom-right corner: positive deltaX = wider, negative deltaY = taller
		const newScaleX = Math.max(0.1, initialScale[0] + deltaX * 2);
		const newScaleY = Math.max(0.1, initialScale[1] + deltaY * -2);

		set({ scale: [newScaleX, newScaleY] });
	};

	// Handle drag end
	const handleDragEnd = () => {
		setIsDragging(false);
	};

	return (
		<>
			{/* Main decal mesh */}
			<mesh
				position={[
					materialProps.position[0],
					materialProps.position[1],
					materialProps.position[2] + 0.02,
				]}
				onClick={()=>console.log(selectedUserDataStores)}
				onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
				onPointerOut={() => setHover(false)}
				useData={{ store }}
			>
				<planeGeometry args={currentScale} />
				<meshBasicMaterial color={'hotpink'} />
				<Edges
					visible={isSelected}
					lineWidth={3}
					color="#ff6600"
					scale={1}
					renderOrder={1000}
				>
					<meshBasicMaterial
						transparent
						color="#333"
						depthTest={false}
					/>
				</Edges>
				<Edges
					visible={hovered}
					lineWidth={3}
					color="#5c5c5c"
					scale={1}
					renderOrder={1000}
				>
					<meshBasicMaterial
						transparent
						color="#333"
						depthTest={false}
					/>
				</Edges>
			</mesh>

			{/* Corner resize handle (bottom-right) with DragControls */}
			{isSelected && (
				<DragControls
					onDragStart={handleDragStart}
					onDrag={handleDrag}
					onDragEnd={handleDragEnd}
				>
					<mesh
						ref={handleRef}
						position={handlePosition}
						onPointerOver={(e) => (
							e.stopPropagation(), setHover(true)
						)}
						onPointerOut={() => setHover(false)}
					>
						<boxGeometry args={[0.1, 0.1, 0.1]} />
						<meshBasicMaterial color="#ff6600" />
					</mesh>
				</DragControls>
			)}

			{/* The actual decal */}
			<Decal
				mesh={meshRef}
				position={materialProps.position as [number, number, number]}
				scale={[currentScale[0], currentScale[1], 0.1]}
				map={texture}
				rotation={new THREE.Euler(0, 0, 0)}
			/>
		</>
	);
};

export default ImageDecal;
