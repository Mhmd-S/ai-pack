import { useDrag } from '@use-gesture/react';
import { useThree } from '@react-three/fiber';
import { Circle, useCursor, Decal, useTexture, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useState, useRef, useMemo } from 'react';

interface RotationHandlerProps {
	position: [number, number, number];
	scale: [number, number];
	rotation: number;
	normal: THREE.Vector3;
	onUpdate: (rotation: number) => void;
	onHover: (hovered: boolean) => void;
	setIsRotating: (isRotating: boolean) => void;
}

const RotationHandler = ({
	position,
	scale,
	rotation,
	normal,
	onUpdate,
	onHover,
	setIsRotating,
}: RotationHandlerProps) => {
	const [isHovered, setHover] = useState(false);
	useCursor(isHovered, 'grab');
	const { camera, raycaster } = useThree();

	const texture = useTexture('/icons/rotation-icon.svg');

	const decalNormal = useMemo(() => new THREE.Vector3().copy(normal), [normal]);

	// This defines the initial direction of the handle, i.e., rotation = 0
	const upVector = useMemo(() => {
		const worldUp = new THREE.Vector3(0, 1, 0);
		const planeUp = worldUp.clone().projectOnPlane(decalNormal);

		if (planeUp.lengthSq() < 0.0001) {
			// Normal is parallel to world up, use world Z instead
			const worldZ = new THREE.Vector3(0, 0, 1);
			planeUp.copy(worldZ.clone().projectOnPlane(decalNormal));
		}
		return planeUp.normalize();
	}, [decalNormal]);

	const handlerPosition = useMemo(() => {
		const handleOffset = 0.15 + scale[1] / 2;
		const offset = upVector.clone().multiplyScalar(handleOffset);
		offset.applyAxisAngle(decalNormal, rotation);
		return new THREE.Vector3(...position).add(offset);
	}, [position, scale, rotation, decalNormal, upVector]);

	const dragPlane = useRef(new THREE.Plane());
	const decalCenter = useRef(new THREE.Vector3(...position));

	const bind = useDrag(
		({ first, last, event }) => {
			const e = event as unknown as PointerEvent;
			if (first) {
				setIsRotating(true);
				decalCenter.current.set(...position);
				// The drag plane is the decal's plane
				dragPlane.current.setFromNormalAndCoplanarPoint(
					decalNormal,
					decalCenter.current
				);
			}

			const intersectionPoint = new THREE.Vector3();
			// Raycast from camera to the drag plane
			if (!raycaster.ray.intersectPlane(dragPlane.current, intersectionPoint))
				return;

			// Vector from decal center to the intersection point
			const dragVector = intersectionPoint.sub(decalCenter.current);

			// We don't need to project, since the intersection is already on the plane

			// Calculate the signed angle between the 'up' vector and the drag vector
			let angle = upVector.angleTo(dragVector);

			// Determine the sign of the angle
			const cross = new THREE.Vector3().crossVectors(upVector, dragVector);
			if (decalNormal.dot(cross) < 0) {
				angle = -angle;
			}

			onUpdate(angle);

			if (last) {
				setIsRotating(false);
			}
		},
		{
			eventOptions: { pointer: true } as any,
		}
	);

	return (
		<group {...bind()}>
			<Billboard>
				<Circle
					args={[0.08, 32]} // Increased radius for easier grabbing
					position={handlerPosition}
					onPointerOver={(e) => {
						e.stopPropagation();
						onHover(true);
						setHover(true);
					}}
					onPointerOut={() => {
						onHover(false);
						setHover(false);
					}}>
					<meshBasicMaterial
						color={isHovered ? '#00aaff' : '#007bff'}
						transparent
						opacity={0.95}
						depthTest={false} // Renders on top
					/>
					<Decal
						position={[0, 0, 0.01]} // A slight Z offset to prevent z-fighting
						rotation={0}
						scale={0.1} // Scale the decal to fit within the circle
						map={texture}
					/>
				</Circle>
			</Billboard>
		</group>
	);
};

export default RotationHandler;
