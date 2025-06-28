import { useSelect, useCursor } from '@react-three/drei';
import { useDrag } from '@use-gesture/react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import RotationHandler from '../Handler/RotationHandlert';

import TextBox from '@/components/edit/Decals/TextBox';
import * as THREE from 'three';
import { useState, useRef, useEffect } from 'react';
import { useControlsDecals } from '../MultiLeva';
import HandlerGroup from '../Handler/HandlerGroup';
import DecalMesh from './DecalMesh';
import { Store } from 'leva';

interface TextDecalProps {
	text: string;
	parentGeometry: THREE.BufferGeometry;
	meshRef: React.RefObject<THREE.Mesh>;
	rotation: number;
	center: THREE.Vector3;
}

interface DecalProps {
	position: [number, number, number];
	scale: [number, number];
	rotation: [number, number, number];
}

const TextDecal = ({ text, parentGeometry, meshRef, rotation, center }: TextDecalProps) => {
	const [hovered, setHover] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [isRotating, setIsRotating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	// Get access to R3F's state, including camera and raycaster
	const { camera, raycaster } = useThree();

	const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

	const bounds =
		parentGeometry.boundingBox ||
		new THREE.Box3().setFromBufferAttribute(
			parentGeometry.attributes.position as THREE.BufferAttribute
		);
	// const center = bounds.getCenter(new THREE.Vector3());

	const [store, materialProps, set] = useControlsDecals(
		selectedUserDataStores,
		{
			position: {
				value: [center.x, center.y, center.z],
			},
			scale: {
				value: [0.2, 0.05],
			},
			size: {
				value: 16,
			},
			color: {
				value: '#000000',
			},
			'font family': {
				value: 'San Serif',
			},
			rotation: [0, rotation, 0],
		}
	) as [Store, DecalProps, (updates: Partial<DecalProps>) => void];

	useEffect(() => {
		const offset = 0.02;
		let { x, y, z } = center;

		const absX = Math.abs(x);
		const absY = Math.abs(y);
		const absZ = Math.abs(z);

		if (absX > absY && absX > absZ) {
			x += (Math.sign(x) * offset);
		} else if (absY > absX && absY > absZ) {
			y += (Math.sign(y) * offset);
		} else {
			z += (Math.sign(z) * offset);
		}

		set({ rotation: [0, rotation, 0] });
		set({ position: [x, y, z] });
	}, [rotation, center, set]);

	const isSelected = !!selectedUserDataStores.find((s) => s === store);
	const currentScale = materialProps.scale || [1, 0.5];

	const handleRotationUpdate = (newRotation: number) => {
		set({ rotation: [0, newRotation, 0] });
	};

	const handleUpdate = (newProps: {
		scale: [number, number];
		position: [number, number, number];
	}) => {
		set({ scale: newProps.scale, position: newProps.position });
	};

	const handlePointerOver = (e: any) => {
		e.stopPropagation();
		setHover(true);
	};

	// Refs to store drag-related 3D data
	const dragPlane = useRef(new THREE.Plane());
	const dragStartPoint = useRef(new THREE.Vector3());
	const dragOffset = useRef(new THREE.Vector3());

	const bind = useDrag(
		({ event, down, first }) => {
			if (!isSelected || isResizing || isRotating) return;

			// We are working with a non-HTML element, so we need to access the original event
			const e = event as unknown as ThreeEvent<PointerEvent>;

			// Only proceed if actively dragging (mouse/pointer is down)
			if (!down) return;

			if (first) {
				// On first drag event, calculate the drag plane

				// 1. Find intersection point on the DecalMesh
				const intersection = e.intersections[0];
				if (!intersection) return; // Should not happen if drag starts on the object
				dragStartPoint.current.copy(intersection.point);

				// 2. Create a plane at that point, oriented towards the camera
				dragPlane.current.setFromNormalAndCoplanarPoint(
					camera.getWorldDirection(dragPlane.current.normal),
					dragStartPoint.current
				);

				// 3. Calculate offset between current decal position and drag start point
				const currentPosition = new THREE.Vector3(
					materialProps.position[0],
					materialProps.position[1],
					materialProps.position[2]
				);
				dragOffset.current.subVectors(
					currentPosition,
					dragStartPoint.current
				);

				// Don't update position on first event, just set up the plane
				return;
			}

			// On every subsequent drag event, raycast onto the plane
			const intersectionPoint = new THREE.Vector3();
			raycaster.ray.intersectPlane(dragPlane.current, intersectionPoint);

			// Apply the offset to maintain relative position
			intersectionPoint.add(dragOffset.current);

			// Calculate half extents of the decal based on current scale
			const halfWidth = currentScale[0] / 2;
			const halfHeight = currentScale[1] / 2;

			// Clamp the position to stay within parent geometry bounds
			// considering the decal's dimensions
			const clampedX = Math.max(
				bounds.min.x + halfWidth,
				Math.min(bounds.max.x - halfWidth, intersectionPoint.x)
			);
			const clampedY = Math.max(
				bounds.min.y + halfHeight,
				Math.min(bounds.max.y - halfHeight, intersectionPoint.y)
			);

			// The intersection point is the new position (clamped to bounds)
			const newPosition: [number, number, number] = [
				clampedX,
				clampedY,
				center.z,
			];

			// Update state via Leva controls
			set({ position: newPosition });
		},
		{
			// We need to use pointer events to get intersection data from R3F
			eventOptions: { pointer: true } as any,
		}
	);

	return (
		<>
			{/* Visual representation mesh */}
			{/* A interactable interface for the user, the decal itself is too rigid to control directly */}
			<group {...bind()}>
				<DecalMesh
					meshRef={meshRef}
					position={[
						materialProps.position[0],
						materialProps.position[1],
						materialProps.position[2] + 0.01,
					]}
					rotation={materialProps.rotation}
					scale={currentScale}
					isSelected={isSelected}
					isHovered={hovered}
					store={store}
					onPointerOver={handlePointerOver}
					onPointerOut={() => setHover(false)}
				/>
			</group>

			{/* The actual editable text */}
			<TextBox
				position={[
					materialProps.position[0],
					materialProps.position[1],
					materialProps.position[2],
				]}
				setIsEditing={setIsEditing}
				rotation={materialProps.rotation}
				scale={[currentScale[0], currentScale[1], 1]}
				initialText={text}
				color={materialProps.color}
				size={materialProps.fontSize}
				// fontFamily={materialProps['font family']}
				isSelected={isSelected}
				isEditing={isEditing}
			/>

			{/* Handler group for resize handles */}
			{isSelected && (
				<>
					<HandlerGroup
						position={[
							materialProps.position[0],
							materialProps.position[1],
							materialProps.position[2],
						]}
						scale={currentScale}
						rotation={materialProps.rotation}
						onUpdate={handleUpdate}
						onHover={setHover}
						setIsResizing={setIsResizing}
						isText
					/>
					<RotationHandler
						position={[
							materialProps.position[0],
							materialProps.position[1],
							materialProps.position[2],
						]}
						scale={currentScale}
						rotation={materialProps.rotation}
						onUpdate={handleRotationUpdate}
						onHover={setHover}
						setIsRotating={setIsRotating}
					/>
				</>
			)}
		</>
	);
};

export default TextDecal;
