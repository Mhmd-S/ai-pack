import {
	Decal,
	useTexture,
	useSelect,
	useCursor,
	DragControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { useState } from 'react';
import { useControlsDecals } from '../MultiLeva';
import HandlerGroup from './Handler/HandlerGroup';
import DecalMesh from './DecalMesh';

interface ImageDecalProps {
	url: string;
	parentGeometry: THREE.BufferGeometry;
	meshRef: React.RefObject<THREE.Mesh>;
}

interface DecalProps {
	position: [number, number, number];
	scale: [number, number];
}

const ImageDecal = ({ url, parentGeometry, meshRef }: ImageDecalProps) => {
	const [hovered, setHover] = useState(false);
	const [isResizing, setIsResizing] = useState(false);

	const texture = useTexture(url);
	const standardWidth = 0.5;
	const aspectRatio = texture.image
		? texture.image.height / texture.image.width
		: 1;
	const standardHeight = standardWidth * aspectRatio;

	const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

	// Calculate bounds from parent geometry
	const bounds = parentGeometry.boundingBox || new THREE.Box3().setFromBufferAttribute(
		parentGeometry.attributes.position as THREE.BufferAttribute
	);
	const center = bounds.getCenter(new THREE.Vector3());

	const [store, materialProps, set] = useControlsDecals(
		selectedUserDataStores,
		{
			position: {
				value: [center.x, center.y, center.z],
			},
			scale: {
				value: [standardWidth, standardHeight],
			},
		}
	) as [any, DecalProps, (props: Partial<DecalProps>) => void];

	useCursor(hovered);

	const isSelected = !!selectedUserDataStores.find((s) => s === store);
	const currentScale = materialProps.scale || [1, 1];

	// Calculate drag limits based on parent geometry bounds with some padding
	const padding = 0.1;
	const dragLimits: [[number, number], [number, number], [number, number]] = [
		[bounds.min.x + padding, bounds.max.x - padding],
		[bounds.min.y + padding, bounds.max.y - padding],
		[materialProps.position[2], materialProps.position[2]], // Keep Z constant
	];

	const handleScaleChange = (newScale: [number, number]) => {
		set({ scale: newScale });
	};

	const handlePointerOver = (e: any) => {
		e.stopPropagation();
		setHover(true);
	};

	const handleDrag = (
		localMatrix: THREE.Matrix4
	) => {
		if (isResizing && isSelected) return;

		const currentPosition = new THREE.Vector3();
		localMatrix.decompose(
			currentPosition,
			new THREE.Quaternion(),
			new THREE.Vector3()
		);

		// Clamp position to stay within bounds
		const clampedX = Math.max(
			dragLimits[0][0],
			Math.min(dragLimits[0][1], currentPosition.x)
		);
		const clampedY = Math.max(
			dragLimits[1][0], 
			Math.min(dragLimits[1][1], currentPosition.y)
		);

		const newPosition: [number, number, number] = [
			clampedX, 
			clampedY, 
			materialProps.position[2]
		];

		set({ position: newPosition });
	};

	return (
		<>
			{/* Visual representation mesh */}
			<DragControls
				onDrag={handleDrag}
				dragLimits={dragLimits}
				autoTransform={false}
			>
				{/* A interactable interface for the user, the decal itself is too rigid to control directly */}
				<DecalMesh
					position={materialProps.position}
					scale={currentScale}
					isSelected={isSelected}
					isHovered={hovered}
					store={store}
					onPointerOver={handlePointerOver}
					onPointerOut={() => setHover(false)}
				/>
			</DragControls>
			{/* Handler group for resize handles */}
			{isSelected && (
				<HandlerGroup
					position={materialProps.position}
					isResizing={isResizing}
					scale={currentScale}
					onScaleChange={handleScaleChange}
					onHover={setHover}
					setIsResizing={setIsResizing}
				/>
			)}
			{/* The actual decal */}
			<Decal
				mesh={meshRef}
				position={materialProps.position}
				scale={[currentScale[0], currentScale[1], currentScale[0]]}
				map={texture}
				rotation={new THREE.Euler(0, 0, 0)}
				polygonOffsetFactor={0.001}
			/>
		</>
	);
};

export default ImageDecal;
