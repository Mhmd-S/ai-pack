import { useDrag } from "@use-gesture/react";
import { ThreeEvent, useThree } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { useState, useRef, useMemo } from "react";
import { Container, Image } from "@react-three/uikit";

interface RotationHandlerProps {
  visibility: "visible" | "hidden";
  position: [number, number, number];
  scale: [number, number];
  rotation: [number, number, number];
  normal: THREE.Vector3;
  boundingBox: THREE.Box3;
  onUpdate: (rotation: [number, number, number]) => void;
  onHover: (hovered: boolean) => void;
  setIsRotating: (isRotating: boolean) => void;
}

const RotationHandler = ({
  visibility,
  position,
  scale,
  rotation,
  normal,
  boundingBox,
  onUpdate,
  onHover,
  setIsRotating,
}: RotationHandlerProps) => {
  const [isHovered, setHover] = useState(false);
  const containerRef = useRef<any>(null);

  useCursor(isHovered, "grab");

  const { raycaster, camera } = useThree();

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
    const handleOffset = 0.05 + scale[1] / 1.5;
    const offset = upVector.clone().multiplyScalar(handleOffset);

    // Apply the full 3D rotation to the upVector to see how it's been rotated
    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], "XYZ");
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    const rotatedUpVector = upVector.clone().applyMatrix4(rotationMatrix);

    // Project the rotated up vector onto the plane perpendicular to the normal
    const projectedUp = rotatedUpVector
      .clone()
      .projectOnPlane(decalNormal)
      .normalize();

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

  // Calculate angle between two points
  const calculateAngle = (
    centerX: number,
    centerY: number,
    pointX: number,
    pointY: number
  ) => {
    const deltaX = pointX - centerX;
    const deltaY = pointY - centerY;
    const angle = Math.atan2(deltaY, deltaX)
    return angle;
  };

  const dragPlane = useRef(new THREE.Plane());
  const dragStartPoint = useRef(new THREE.Vector3());
  const dragOffset = useRef(new THREE.Vector3());
  const intersectionPoint = useRef(new THREE.Vector3());

  const initialAngle = useRef(0);
  const currentAngle = useRef(0);
  const angleDelta = useRef(0);
  const lastValidAngle = useRef(0);
  const accumulatedRotation = useRef(0);
    

  const bind = useDrag(
    ({ first, last, event, dragging }) => {
      event.stopPropagation();

      const e = event as unknown as ThreeEvent<PointerEvent>;

      // Calculate camera distance to handler for speed adjustment
      const cameraPosition = camera.position;
      const handlerWorldPosition = handlerPosition;
      const cameraDistance = cameraPosition.distanceTo(handlerWorldPosition);
      
      // Scale rotation speed based on camera distance
      // Closer camera = slower rotation, further camera = faster rotation
      // Base distance of 5 units gives normal speed (1x)
      const baseCameraDistance = 2
      const distanceScaleFactor = Math.max(0.1, Math.min(3, cameraDistance / baseCameraDistance));

      if (first) {
        setIsRotating(true);
        // 1. Find intersection point on the DecalMesh
        const intersection = e.intersections[0];
        if (!intersection) return; // Should not happen if drag starts on the object
        dragStartPoint.current.copy(intersection.point);

        // 2. Create a plane at that point, oriented towards the camera
        dragPlane.current.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(dragPlane.current.normal),
          new THREE.Vector3(position[0], position[1], position[2])
        );


        dragOffset.current.subVectors(handlerPosition, dragStartPoint.current);
        
        // Reset accumulated rotation for new drag session
        accumulatedRotation.current = 0;
      }

      if (dragging) {
        // On every subsequent drag event, raycast onto the plane
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        // On every subsequent drag event, raycast onto the plane
        raycaster.ray.intersectPlane(
          dragPlane.current,
          intersectionPoint.current
        );

        // Apply the offset to maintain relative position
        intersectionPoint.current.add(dragOffset.current);
        
        const xy = [];
        let intersectionX, intersectionY;

        // The smallest dimension of the bounding box tells us the plane's normal direction.
        if (size.z < size.x && size.z < size.y) {
          // XY plane is dominant (normal along Z)
          xy.push(position[0], position[1]);
          intersectionX = intersectionPoint.current.x;
          intersectionY = intersectionPoint.current.y;
        } else if (size.y < size.x && size.y < size.z) {
          // XZ plane is dominant (normal along Y)
          xy.push(position[0], position[2]);
          intersectionX = intersectionPoint.current.x;
          intersectionY = intersectionPoint.current.z;
        } else {
          // YZ plane is dominant (normal along X)
          xy.push(position[1], position[2]);
          intersectionX = intersectionPoint.current.y;
          intersectionY = intersectionPoint.current.z;
        }

        // Check if we're too close to the center to avoid division by zero or unstable angles
        const deltaX = intersectionX - xy[0];
        const deltaY = intersectionY - xy[1];
        const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If too close to center, use the last valid angle to prevent jumping
        if (distanceFromCenter < 0.01) {
          currentAngle.current = lastValidAngle.current;
        } else {
          // Calculate the current angle
          const rawAngle = calculateAngle(xy[0], xy[1], intersectionX, intersectionY);
          
          if (first) {
            initialAngle.current = rawAngle;
            lastValidAngle.current = rawAngle;
            currentAngle.current = rawAngle;
          } else {
            // Handle angle wrapping (crossing from -π to π or vice versa)
            let angleDiff = rawAngle - lastValidAngle.current;
            
            // Normalize angle difference to [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // Add to accumulated rotation
            accumulatedRotation.current += angleDiff;
            
            // Update current angle and last valid angle
            lastValidAngle.current = rawAngle;
            currentAngle.current = initialAngle.current + accumulatedRotation.current;
          }
        }

        angleDelta.current = (currentAngle.current - initialAngle.current) * distanceScaleFactor;

        if (size.z < size.x && size.z < size.y) {
          // XY plane is dominant (normal along Z)
          onUpdate([position[0], position[1], angleDelta.current]); 
        } else if (size.y < size.x && size.y < size.z) {
          // XZ plane is dominant (normal along Y)
          onUpdate([position[0], angleDelta.current, position[2]]);
        } else {
          // YZ plane is dominant (normal along X)
          onUpdate([angleDelta.current, position[1], position[2]]);
        }
      }
    },
    {
      eventOptions: { pointer: true } as any,
    }
  );

  return (
    <Container
      ref={containerRef}
      visibility={visibility}
      positionType="absolute"
      transformTranslateX="-50%"
      transformTranslateY="100%"
      positionTop={handlerPosition.y}
      positionLeft={handlerPosition.x}
      width={6}
      height={6}
      cursor="grab"
      {...(bind() as any)}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        setHover(true);
        onHover(true);
      }}
      onPointerOut={() => {
        setHover(false);
        onHover(false);
      }}
    >
      <Image
        visibility={visibility}
        src="/icons/rotation-icon.svg"
        width={5}
        height={5}
        color={isHovered ? "#ff6b6b" : "#ff4444"}
        objectFit="fill"
        opacity={isHovered ? 1.0 : 0.8}
      />
    </Container>
  );
};

export default RotationHandler;
