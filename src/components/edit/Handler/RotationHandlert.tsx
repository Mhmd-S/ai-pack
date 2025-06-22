import { useDrag } from '@use-gesture/react';
import { useThree } from '@react-three/fiber';
import { Circle, useCursor, Decal, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useState, useRef, useMemo } from 'react';

interface RotationHandlerProps {
	position: [number, number, number];
	scale: [number, number];
	rotation: number;
	onUpdate: (rotation: number) => void;
	onHover: (hovered: boolean) => void;
	setIsRotating: (isRotating: boolean) => void;
}

const RotationHandler = ({
	position,
	scale,
	rotation,
	onUpdate,
	onHover,
	setIsRotating,
}: RotationHandlerProps) => {
	const [isHovered, setHover] = useState(false);
	useCursor(isHovered, 'grab');
	const { camera, raycaster } = useThree();

	const texture = useTexture('/icons/rotation-icon.svg');

	const handlerRef = useRef<THREE.Mesh>(null!);

	const handlerPosition = useMemo(() => {
		// Position the handler above the decal's top edge
		const offset = new THREE.Vector3(0, scale[1] / 2 + 0.15, 0);
		// Apply the decal's current rotation to the offset
		offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation);
		// Add the rotated offset to the decal's center position
		return new THREE.Vector3(...position).add(offset);
	}, [position, scale, rotation]);

	const dragPlane = useRef(new THREE.Plane());
	const decalCenter = useRef(new THREE.Vector3(...position));

	const bind = useDrag(
		({ first, last, event }) => {
			const e = event as unknown as PointerEvent;
			if (first) {
				setIsRotating(true);
				// Set up a plane at the decal's center, facing the camera
				decalCenter.current.set(...position);
				dragPlane.current.setFromNormalAndCoplanarPoint(
					camera.getWorldDirection(dragPlane.current.normal),
					decalCenter.current
				);
			}

			// Raycast from camera to the drag plane
			const intersectionPoint = new THREE.Vector3();
			if (
				!raycaster.ray.intersectPlane(
					dragPlane.current,
					intersectionPoint
				)
			)
				return;

			// Calculate vector from decal center to intersection point
			const vector = intersectionPoint.sub(decalCenter.current);

			// Calculate angle. We subtract PI/2 because Math.atan2 considers 0 radians
			// to be along the positive X-axis (right), but we want our "zero" rotation
			// to be when the handle is at the top.
			const angle = Math.atan2(vector.y, vector.x) - Math.PI / 2;

			onUpdate(angle); // Update rotation in parent (negated for intuitive control)

			if (last) {
				setIsRotating(false);
			}
		},
		{
			eventOptions: { pointer: true },
		}
	);

	return (
		<group {...bind()}>
        <Circle
            args={[0.04, 32]} // Increased radius for easier grabbing
            position={handlerPosition}
            onPointerOver={(e) => {
                e.stopPropagation();
                onHover(true);
                setHover(true);
            }}
            onPointerOut={() => {
                onHover(false);
                setHover(false);
            }}
        >
            <meshBasicMaterial
                color={isHovered ? '#00aaff' : '#007bff'}
                transparent
                opacity={0.95}
                depthTest={false} // Renders on top
            />
            {/* CORRECT USAGE:
              The Decal is now a child of the Circle mesh.
              It will project the texture onto the Circle's surface.
            */}
            <Decal
                position={[0, 0, 0.01]} // A slight Z offset to prevent z-fighting
                rotation={0}
                scale={0.1} // Scale the decal to fit within the circle
                map={texture}
            />
        </Circle>
		</group>
	);
};

export default RotationHandler;
