import React, { useRef, useCallback, useState, useEffect } from "react";
import { useDrag } from "@use-gesture/react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Billboard, Circle, useCursor } from "@react-three/drei";

interface HandlerProps {
  position: THREE.Vector3;
  cursor: string;
  normal: THREE.Vector3;
  onDragStart: () => void;
  onDrag: (movement: THREE.Vector2) => void;
  onDragEnd: () => void;
  onHover: (hovered: boolean) => void;
}

/**
 * A single interactive resize handle.
 * This component is "dumb" - it only knows how to translate a screen gesture
 * into a world-space movement vector and report it to its parent.
 */
const Handler = ({
  position,
  cursor,
  normal,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: HandlerProps) => {
  const { camera, raycaster } = useThree();

  useCursor(true, cursor);

  const dragState = useRef({
    plane: new THREE.Plane(),
    initialPoint: new THREE.Vector3(),
  }).current;

  const handlePointerOver = useCallback(
    (e: any) => {
      e.stopPropagation();
      document.body.style.cursor = cursor;
      onHover(true);
    },
    [onHover, cursor]
  );

  const handlePointerOut = useCallback(() => {
    if (document.body.style.cursor === cursor) {
      document.body.style.cursor = "auto";
    }
    onHover(false);
  }, [onHover, cursor]);

  const bind = useDrag((state) => {
    const {
      active,
      first,
      last,
      xy: [px, py],
      event,
    } = state;

    event.stopPropagation();

    if (first) {
      onDragStart();
      dragState.plane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()),
        position
      );
      raycaster.ray.intersectPlane(dragState.plane, dragState.initialPoint);
    }

    if (active) {
      const currentPoint = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(dragState.plane, currentPoint)) {
        // Calculate the 3D movement vector
        const movement3D = new THREE.Vector3()
          .copy(currentPoint)
          .sub(dragState.initialPoint);

        // Create a local coordinate system for the face using the normal
        // We need two orthogonal vectors in the plane perpendicular to the normal
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(up, normal).normalize();
        
        // If right vector is zero (normal is parallel to up), use a different reference
        if (right.length() < 0.001) {
          const forward = new THREE.Vector3(0, 0, 1);
          right.crossVectors(forward, normal).normalize();
        }
        
        // Calculate the actual up vector perpendicular to both normal and right
        const localUp = new THREE.Vector3().crossVectors(normal, right).normalize();

        // Project the 3D movement onto the face's local 2D coordinate system
        const movement = new THREE.Vector2(
          movement3D.dot(right),    // Movement along the right axis (local X)
          movement3D.dot(localUp)   // Movement along the up axis (local Y)
        );
        
        onDrag(movement);
      }
    }

    if (last) {
      onDragEnd();
      handlePointerOut();
    }
  }, {});

  return (
    <Billboard
      position={position}
      {...bind()}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <Circle args={[0.01, 24]}>
        <meshBasicMaterial color="#000000" transparent depthTest={false} />
      </Circle>
    </Billboard>
  );
};

export default Handler;
