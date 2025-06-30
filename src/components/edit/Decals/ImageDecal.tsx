import { Decal, useTexture, useSelect, useCursor } from '@react-three/drei';
import { useDrag } from '@use-gesture/react';
import { useThree } from '@react-three/fiber';
import RotationHandler from '../Handler/RotationHandler';

import * as THREE from 'three';
import { useState, useRef, useEffect } from 'react';
import { useControlsDecals } from '../MultiLeva';
import HandlerGroup from '../Handler/HandlerGroup';
import DecalMesh from './DecalMesh';

interface ImageDecalProps {
	url: string;
	parentGeometry: THREE.BufferGeometry;
	meshRef: React.RefObject<THREE.Mesh>;
	initialRotation: [number, number, number];
	normal: THREE.Vector3;
	center: THREE.Vector3;
	boundingBox: THREE.Box3;
}

interface DecalProps {
	position: [number, number, number];
	scale: [number, number];
	rotation: [number, number, number];
}

const ImageDecal = ({ url, meshRef, initialRotation, center, boundingBox, normal }: ImageDecalProps) => {
	const [hovered, setHover] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [isRotating, setIsRotating] = useState(false);

	// Get access to R3F's state, including camera and raycaster
	const { camera, raycaster } = useThree();

	const texture = useTexture(url);
	const standardWidth = 0.5;
	const aspectRatio = texture.image
		? texture.image.height / texture.image.width
		: 1;
	const standardHeight = standardWidth * aspectRatio;

	const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

	const [store, materialProps, set] = useControlsDecals(
		selectedUserDataStores,
		{
			position: {
				value: [center.x, center.y, center.z],
			},
			scale: {
				value: [standardWidth, standardHeight],
			},
			rotation: { value: initialRotation, render: () => false },
		}
	) as [any, DecalProps, (props: Partial<DecalProps>) => void];

	useCursor(hovered);

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

		set({ rotation: [initialRotation[0], initialRotation[1], initialRotation[2]] });
		set({ position: [x, y, z] });
	}, [center]);


	const isSelected = !!selectedUserDataStores.find((s) => s === store);
	const currentScale = materialProps.scale || [1, 1];

	const handleRotationUpdate = (newRotation: [number, number, number]) => {
		set({ rotation: newRotation });
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
			const size = new THREE.Vector3();
			boundingBox.getSize(size);

			let newPosition: [number, number, number];

			// The smallest dimension of the bounding box tells us the plane's normal direction.
			if (size.z < size.x && size.z < size.y) {
				// XY plane is dominant (normal along Z)
				const clampedX = Math.max(
					boundingBox.min.x + halfWidth,
					Math.min(boundingBox.max.x - halfWidth, intersectionPoint.x)
				);
				const clampedY = Math.max(
					boundingBox.min.y + halfHeight,
					Math.min(boundingBox.max.y - halfHeight, intersectionPoint.y)
				);
				newPosition = [clampedX, clampedY, materialProps.position[2]];
			} else if (size.y < size.x && size.y < size.z) {
				// XZ plane is dominant (normal along Y)
				const clampedX = Math.max(
					boundingBox.min.x + halfWidth,
					Math.min(boundingBox.max.x - halfWidth, intersectionPoint.x)
				);
				const clampedZ = Math.max(
					boundingBox.min.z + halfHeight,
					Math.min(boundingBox.max.z - halfHeight, intersectionPoint.z)
				);
				newPosition = [clampedX, materialProps.position[1], clampedZ];
			} else {
				// YZ plane is dominant (normal along X)
				const clampedY = Math.max(
					boundingBox.min.y + halfHeight,
					Math.min(boundingBox.max.y - halfHeight, intersectionPoint.y)
				);
				const clampedZ = Math.max(
					boundingBox.min.z + halfHeight,
					Math.min(boundingBox.max.z - halfHeight, intersectionPoint.z)
				);
				newPosition = [materialProps.position[0], clampedY, clampedZ];
			}

			// Update state via Leva controls
			set({ position: newPosition });
		},
		{
			// We need to use pointer events to get intersection data from R3F
			eventOptions: { pointer: true },
		}
	);
	return (
		<>
			{/* Visual representation mesh */}
			{/* A interactable interface for the user, the decal itself is too rigid to control directly */}
			<group {...bind()}>
			<DecalMesh
					position={[
						materialProps.position[0],
						materialProps.position[1],
						materialProps.position[2],
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

			{/* The actual decal */}
			<Decal
				mesh={meshRef}
				position={[
					materialProps.position[0],
					materialProps.position[1],
					materialProps.position[2],
				]}
				scale={[currentScale[0], currentScale[1], currentScale[0]]}
				rotation={new THREE.Euler(materialProps.rotation[0], materialProps.rotation[1], materialProps.rotation[2])}
			>
				<meshBasicMaterial
					map={texture}
					polygonOffset
					polygonOffsetFactor={-2} // Prevents z-fighting
					transparent
				/>
			</Decal>

			{/* Add rotation handler */}

			{/* Handler group for resize handles */}
			{isSelected && (
				<>
				<HandlerGroup
					scale={currentScale}
					position={[
						materialProps.position[0],
						materialProps.position[1],
						materialProps.position[2],
					]}
					rotation={materialProps.rotation}
					onUpdate={handleUpdate}
					onHover={setHover}
					setIsResizing={setIsResizing}
				/>
				<RotationHandler
					position={[
						materialProps.position[0],
						materialProps.position[1],
						materialProps.position[2],
					]}
					scale={currentScale}
					rotation={materialProps.rotation}
					normal={normal}
					onUpdate={handleRotationUpdate}
					onHover={setHover}
					setIsRotating={setIsRotating}
				/>
			</>
			)}
		</>
	);
};

export default ImageDecal;
