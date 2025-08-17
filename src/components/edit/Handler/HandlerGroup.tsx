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

interface HandlerGroupProps {
  visibility: "visible" | "hidden";
  scale: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  normal: THREE.Vector3;
  aspectRatio: number;
  store: any;
  onUpdate: (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
    handlerId?: string;
    handlerPosition?: THREE.Vector3;
  }) => void;
  onHover: (hovered: boolean) => void;
  setIsResizing: (isResizing: boolean, handlerId?: string) => void;
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
];

const HandlerGroup = ({
  visibility,
  scale,
  position,
  rotation,
  normal,
  aspectRatio,
  onUpdate,
  onHover,
  setIsResizing,
  store,
}: HandlerGroupProps) => {
  const dragInfo = useRef({
    initialPosition: new THREE.Vector3(),
    initialScale: new THREE.Vector2(),
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
    setIsResizing(true, handler.id);

    dragInfo.initialPosition.set(...position);
    dragInfo.initialScale.set(...scale);
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
    console.log("dragInfo Handler", dragInfo);
  };

  const handleDrag = (handler: HandlerConfig, movement: THREE.Vector2) => {
    const { initialScale, signX, signY, pivotSignX, pivotSignY, pivotWorld } =
      dragInfo;

    // Work directly with local x/y deltas provided by Handler (already scaled)
    const halfWidth0 = initialScale.x / 2;
    const halfHeight0 = initialScale.y / 2;

    // Apply movement along the handle's signed axes
    const deltaHalfWidth = movement.x * signX;
    const deltaHalfHeight = -movement.y * signY; // invert Y from screen to local up

    let halfWidthCandidate = Math.max(0.005, halfWidth0 + deltaHalfWidth);
    let halfHeightCandidate = Math.max(0.005, halfHeight0 + deltaHalfHeight);

    if (halfWidthCandidate / halfHeightCandidate > aspectRatio) {
      // Width-dominant: adjust height
      halfHeightCandidate = halfWidthCandidate / aspectRatio;
    } else {
      // Height-dominant: adjust width
      halfWidthCandidate = halfHeightCandidate * aspectRatio;
    }

    const newWidth = Math.max(0.01, halfWidthCandidate * 2);
    const newHeight = Math.max(0.01, halfHeightCandidate * 2);

    // Recompute center from fixed pivot: C = P - (pivotSignX*hw, pivotSignY*hh)
    const newCenterX = pivotWorld.x - pivotSignX * halfWidthCandidate;
    const newCenterY = pivotWorld.y - pivotSignY * halfHeightCandidate;

    const updateProps: any = {
      position: [newCenterX, newCenterY, pivotWorld.z] as [
        number,
        number,
        number,
      ],
      resizeType: handler.type,
      handlerId: handler.id,
      scale: [newWidth, newHeight] as [number, number],
    };

    onUpdate(updateProps);
  };

  const handleDragEnd = () => {
    setIsResizing(false, undefined);
  };

  return (
    <Container
      width={"100%"}
      height={"100%"}
      positionType="absolute"
      positionRight={-0.001}
      positionBottom={-1}
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

export default HandlerGroup;
