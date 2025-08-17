import { useEffect, useRef } from "react";
import * as THREE from "three";
import Handler from "./Handler";
import { Container } from "@react-three/uikit";

interface HandlerConfig {
  id: string;
  normalizedPosition: [number, number];
  type: "corner" | "edge-x" | "edge-y";
  cursor: string;
}

interface TextHandlerGroupProps {
  visibility: "visible" | "hidden";
  position: [number, number, number];
  scale: [number, number];
  rotation: [number, number, number];
  normal: THREE.Vector3;
  onUpdate: (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    size?: number;
  }) => void;
  onHover: (hovered: boolean) => void;
  setIsResizing: (
    isResizing: boolean,
    resizeType: "corner" | "edge-x" | "edge-y" | null
  ) => void;
  currentSize: number;
  store: any;
}

const handlers: HandlerConfig[] = [
  {
    id: "top-left",
    normalizedPosition: [0, 0],
    type: "corner",
    cursor: "nwse-resize",
  },
  {
    id: "top-right",
    normalizedPosition: [1, 0],
    type: "corner",
    cursor: "nesw-resize",
  },
  {
    id: "bottom-left",
    normalizedPosition: [0, 1],
    type: "corner",
    cursor: "nesw-resize",
  },
  {
    id: "bottom-right",
    normalizedPosition: [1, 1],
    type: "corner",
    cursor: "nwse-resize",
  },
  {
    id: "left",
    normalizedPosition: [0, 0.5],
    type: "edge-x",
    cursor: "ew-resize",
  },
  {
    id: "right",
    normalizedPosition: [1, 0.5],
    type: "edge-x",
    cursor: "ew-resize",
  },
];

const TextHandlerGroup = ({
  visibility,
  position,
  scale,
  rotation,
  normal,
  onUpdate,
  onHover,
  setIsResizing,
  currentSize,
  store,
}: TextHandlerGroupProps) => {
  const dragInfo = useRef({
    initialPosition: new THREE.Vector3(),
    initialScale: new THREE.Vector2(),
    initialSize: 0,
    handlerId: "",
    signX: 1 as 1 | -1,
    signY: 1 as 1 | -1,
    pivotSignX: 1 as 1 | -1,
    pivotSignY: 1 as 1 | -1,
    pivotWorld: new THREE.Vector3(),
  }).current;

  const containerRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.interactionPanel.userData = { store, isDecal: true };
    }
  }, []);

  const getHandleSigns = (handlerId: string): { sx: 1 | -1; sy: 1 | -1 } => {
    switch (handlerId) {
      case "top-left":
        return { sx: -1, sy: 1 };
      case "top-right":
        return { sx: 1, sy: 1 };
      case "bottom-left":
        return { sx: -1, sy: -1 };
      case "bottom-right":
      default:
        return { sx: 1, sy: -1 };
    }
  };

  const getPivotSigns = (handlerId: string): { psx: 1 | -1; psy: 1 | -1 } => {
    switch (handlerId) {
      case "top-left":
        return { psx: 1, psy: -1 }; // pivot is bottom-right
      case "top-right":
        return { psx: -1, psy: -1 }; // pivot is bottom-left
      case "bottom-left":
        return { psx: 1, psy: 1 }; // pivot is top-right
      case "bottom-right":
      default:
        return { psx: -1, psy: 1 }; // pivot is top-left
    }
  };

  const handleDragStart = (handler: HandlerConfig) => {
    setIsResizing(true, handler.type);

    dragInfo.initialPosition.set(...position);
    dragInfo.initialScale.set(...scale);
    dragInfo.initialSize = currentSize;
    dragInfo.handlerId = handler.id;

    const { sx, sy } = getHandleSigns(handler.id);
    dragInfo.signX = sx;
    dragInfo.signY = sy;

    const { psx, psy } = getPivotSigns(handler.id);
    dragInfo.pivotSignX = psx;
    dragInfo.pivotSignY = psy;

    // Compute and store the pivot world position (opposite corner fixed)
    const halfW0 = dragInfo.initialScale.x / 2;
    const halfH0 = dragInfo.initialScale.y / 2;
    dragInfo.pivotWorld.set(
      dragInfo.initialPosition.x + psx * halfW0,
      dragInfo.initialPosition.y + psy * halfH0,
      dragInfo.initialPosition.z
    );
    console.log("dragInfo Text", dragInfo);
  };

  const handleDrag = (handler: HandlerConfig, movement: THREE.Vector2) => {
    const { initialScale, initialPosition, initialSize, signX, signY, pivotSignX, pivotSignY, pivotWorld } = dragInfo;

    // For corner handlers: use same math as HandlerGroup (fixed opposite pivot)
    if (handler.type === "corner") {
      const halfWidth0 = initialScale.x / 2;
      const halfHeight0 = initialScale.y / 2;

      const deltaHalfWidth = movement.x * signX;
      const deltaHalfHeight = -movement.y * signY; // invert Y from screen to local up

      let halfWidthCandidate = Math.max(0.005, halfWidth0 + deltaHalfWidth);
      let halfHeightCandidate = Math.max(0.005, halfHeight0 + deltaHalfHeight);

      // Preserve original aspect ratio like HandlerGroup
      const aspectRatio = initialScale.x / initialScale.y;
      if (halfWidthCandidate / halfHeightCandidate > aspectRatio) {
        halfHeightCandidate = halfWidthCandidate / aspectRatio;
      } else {
        halfWidthCandidate = halfHeightCandidate * aspectRatio;
      }

      const newWidth = Math.max(0.01, halfWidthCandidate * 2);
      const newHeight = Math.max(0.01, halfHeightCandidate * 2);

      // Recompute center from fixed pivot
      const newCenterX = pivotWorld.x - pivotSignX * halfWidthCandidate;
      const newCenterY = pivotWorld.y - pivotSignY * halfHeightCandidate;

      // Compute new font size proportionally to height change
      const sizeRatio = newHeight / initialScale.y;
      const newSize = Math.max(9, initialSize * sizeRatio);

      const updateProps: any = {
        position: [newCenterX, newCenterY, pivotWorld.z] as [number, number, number],
        scale: [newWidth, newHeight] as [number, number],
        size: newSize,
      };

      onUpdate(updateProps);
      return;
    }

    // Edge handlers: keep previous behavior (horizontal only)
    if (handler.type === "edge-x") {
      const halfWidth0 = initialScale.x / 2;
      const deltaHalfWidth = movement.x; // movement already signed by which edge is dragged visually
      const halfWidthCandidate = Math.max(0.005, halfWidth0 + deltaHalfWidth);
      const newWidth = Math.max(0.01, halfWidthCandidate * 2);

      // Keep Y center the same, adjust X around current center
      const updateProps: any = {
        position: [initialPosition.x, initialPosition.y, initialPosition.z] as [number, number, number],
        scale: [newWidth, initialScale.y] as [number, number],
      };
      onUpdate(updateProps);
      return;
    }
  };

  const handleDragEnd = () => {
    setIsResizing(false, null);
  };

  return (
    <Container
      width={scale[0] * 100}
      height={scale[1] * 100}
      positionType="absolute"
      transformTranslateX="-50%"
      transformTranslateY="-50%"
      zIndexOffset={{ major: 1 }}
      >
      <Container
        positionType="relative"
        width="100%"
        height="100%"
        overflow="visible"
        ref={containerRef}
      >
        {handlers.map((handler) => {
          return (
            <Handler
              visibility={visibility}
              key={handler.id}
              normal={normal}
              position={handler.normalizedPosition}
              cursor={handler.cursor}
              onHover={onHover}
              onDragStart={() => handleDragStart(handler)}
              onDrag={(movement) => handleDrag(handler, movement)}
              onDragEnd={handleDragEnd}
            />
          );
        })}
      </Container>
    </Container>
  );
};

export default TextHandlerGroup;
