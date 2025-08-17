import React, { useRef, useCallback, useState, useEffect } from "react";
import { useDrag } from "@use-gesture/react";
import * as THREE from "three";
import { useCursor } from "@react-three/drei";
import { Container } from "@react-three/uikit";

interface HandlerProps {
  visibility: "visible" | "hidden";
  position: [number, number];
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
  visibility,
  position,
  cursor,
  normal,
  onDragStart,
  onDrag,
  onDragEnd,
  onHover,
}: HandlerProps) => {
  useCursor(true, cursor);

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
    const { active, first, last, event, movement } = state;

    event.stopPropagation();

    if (first) {
      onDragStart();
    }

    if (active) {
      // Use standard x/y movement in pixels and convert to local units
      const scaleFactor = 2000; // 200px == 1 local unit (less sensitive)
      const mv = new THREE.Vector2(
        movement[0] / scaleFactor,
        movement[1] / scaleFactor
      );
      onDrag(mv);
    }

    if (last) {
      onDragEnd();
      handlePointerOut();
    }
  }, {});

  return (
    <Container
      visibility={visibility}
      positionLeft={`${(position[0]-0.025) * 100}%`}
      positionTop={`${(position[1]-0.065) * 100}%`}
      width={1.5}
      height={1.5}
      positionType="absolute"
      backgroundColor="red"
      borderRadius={100}
      {...(bind() as any)}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}

    />
  );
};

export default Handler;
