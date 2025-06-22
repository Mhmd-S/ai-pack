import React, { useRef, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

interface HandlerProps {
  position: THREE.Vector3;
  cursor: string;
  scale: [number, number, number];
  onDragStart: () => void;
  // The key change from my flawed attempt: onDrag does NOT pass the handler config.
  // It only passes the raw movement data.
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
  scale,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: HandlerProps) => {
  const { camera, raycaster, size } = useThree();

  const dragState = useRef({
    plane: new THREE.Plane(),
    initialPoint: new THREE.Vector3(),
  }).current;

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    document.body.style.cursor = cursor;
    onHover(true);
  }, [onHover, cursor]);

  const handlePointerOut = useCallback(() => {
    if (document.body.style.cursor === cursor) {
      document.body.style.cursor = 'auto';
    }
    onHover(false);
  }, [onHover, cursor]);

  const bind = useDrag(
    (state) => {
      const { active, first, last, xy: [px, py] } = state;

      const ndc = new THREE.Vector2(
        (px / size.width) * 2 - 1,
        -(py / size.height) * 2 + 1
      );

      raycaster.setFromCamera(ndc, camera);

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
          const movement = new THREE.Vector2(
            currentPoint.x - dragState.initialPoint.x,
            currentPoint.y - dragState.initialPoint.y
          );
          onDrag(movement);
        }
      }

      if (last) {
        onDragEnd();
        handlePointerOut();
      }
    },
    {}
  );

  return (
    <mesh
      position={position}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      {...bind()}
      quaternion={camera.quaternion}
    >
      <planeGeometry args={[0.02, 0.02]} />
      <meshBasicMaterial color="#ff6600" toneMapped={false} depthTest={false} transparent />
    </mesh>
  );
};

export default Handler;