import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Billboard, Circle, useCursor } from '@react-three/drei';

interface HandlerProps {
  position: THREE.Vector3;
  cursor: string;
  scale: [number, number, number];
  onDragStart: () => void;
  rotation: [number, number, number];
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
  rotation,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: HandlerProps) => {
  const { camera, raycaster, size } = useThree();
  // const [relativeQ, setRelativeQ] = useState<THREE.Quaternion>(new THREE.Quaternion());
  // const [currentRotation, setCurrentRotation] = useState<THREE.Euler>(new THREE.Euler());

  useCursor(true, cursor);

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

  const relativeQuaternion = (rotation: [number, number, number]) => {
    const parentQuaternion = new THREE.Quaternion();
    parentQuaternion.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));

    const childQuaternion = new THREE.Quaternion();
    childQuaternion.setFromEuler(new THREE.Euler(0,0,0));

    const relativeQ = parentQuaternion.clone().premultiply(childQuaternion);
  
    return relativeQ;
  }

  // useEffect(() => {
  //   setRelativeQ(relativeQuaternion(rotation));

  //   const currentQ = new THREE.Quaternion();
  //   currentQ.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));

  //   const childQ = currentQ.clone().premultiply(relativeQ);
  //   setCurrentRotation(new THREE.Euler().setFromQuaternion(childQ));
  // }, []);

  // useEffect(() => {
  //   const currentQ = new THREE.Quaternion();
  //   currentQ.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));

  //   const childQ = currentQ.clone().premultiply(relativeQ);
  //   setCurrentRotation(new THREE.Euler().setFromQuaternion(childQ));
  // }, [rotation]);

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
    <Billboard
      position={position}
      {...bind()}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
			<Circle args={[0.02, 24]}>
				<meshBasicMaterial
					color="#000000"
					transparent
					depthTest={false}
				/>
			</Circle>
    </Billboard>
  );
};

export default Handler;