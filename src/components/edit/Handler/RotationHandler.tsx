import { useDrag } from '@use-gesture/react';
import { useThree } from '@react-three/fiber';
import { Circle, useCursor, Decal, useTexture, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useState, useRef, useMemo } from 'react';

interface RotationHandlerProps {
	position: [number, number, number];
	scale: [number, number];
	rotation: [number, number, number];
	normal: THREE.Vector3;
	onUpdate: (rotation: [number, number, number]) => void;
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
	
	const { raycaster } = useThree();

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
		console.log('upVector', upVector.toArray());
		console.log('decalNormal', decalNormal.toArray());
		console.log('rotation', rotation);
		
		// Apply the full 3D rotation to the upVector to see how it's been rotated
		const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ');
		const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
		const rotatedUpVector = upVector.clone().applyMatrix4(rotationMatrix);
		
		// Project the rotated up vector onto the plane perpendicular to the normal
		const projectedUp = rotatedUpVector.clone().projectOnPlane(decalNormal).normalize();
		
		// Calculate angle between original upVector and projected rotated upVector
		let angle = upVector.angleTo(projectedUp);
		
		// Determine the sign of the angle using cross product
		const cross = new THREE.Vector3().crossVectors(upVector, projectedUp);
		if (decalNormal.dot(cross) < 0) {
			angle = -angle;
		}
		
		// Apply only the rotation around the normal axis
		offset.applyAxisAngle(decalNormal, angle);
		
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

			const newUp = upVector.clone().applyAxisAngle(decalNormal, angle);
			const newRight = new THREE.Vector3().crossVectors(newUp, decalNormal);

			const rotationMatrix = new THREE.Matrix4().makeBasis(
				newRight,
				newUp,
				decalNormal
			);

			const euler = new THREE.Euler().setFromRotationMatrix(rotationMatrix, 'XYZ');

			onUpdate([euler.x, euler.y, euler.z]);

			if (last) {
				setIsRotating(false);
			}
		},
		{
			eventOptions: { pointer: true } as any,
		}
	);

	return (
		<Billboard {...bind()} position={handlerPosition}>
			{/* Subtle background for better visibility */}
			<Circle args={[0.05, 24]}>
				<meshBasicMaterial
					color="#000000"
					transparent
					opacity={isHovered ? 0.2 : 0.1}
					depthTest={false}
				/>
			</Circle>
			
			{/* Main rotation handle */}
			<Circle
				args={[0.03, 22]}
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
					color={isHovered ? '#00ff88' : '#ffffff'}
					map={texture}
					transparent
					opacity={isHovered ? 1.0 : 0.85}
					depthTest={false}
				/>
			</Circle>
		</Billboard>
	);
};

export default RotationHandler;
