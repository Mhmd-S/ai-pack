import { useRef } from "react";
import * as THREE from "three";
import Handler from "./Handler";

interface HandlerConfig {
  id: string;
  normalizedPosition: [number, number];
  type: "corner" | "edge-x" | "edge-y";
  cursor: string;
}

interface HandlerGroupProps {
  position: [number, number, number];
  scale: [number, number];
  rotation: [number, number, number];
  onUpdate: (newProps: {
    scale: [number, number];
    position: [number, number, number];
  }) => void;
  onHover: (hovered: boolean) => void;
  setIsResizing: (isResizing: boolean) => void;
  isText?: boolean;
}

const handlers: HandlerConfig[] = [
  {
    id: "top-left",
    normalizedPosition: [-0.5, 0.5],
    type: "corner",
    cursor: "nwse-resize",
  },
  {
    id: "top-right",
    normalizedPosition: [0.5, 0.5],
    type: "corner",
    cursor: "nesw-resize",
  },
  {
    id: "bottom-left",
    normalizedPosition: [-0.5, -0.5],
    type: "corner",
    cursor: "nesw-resize",
  },
  {
    id: "bottom-right",
    normalizedPosition: [0.5, -0.5],
    type: "corner",
    cursor: "nwse-resize",
  },
  {
    id: "top",
    normalizedPosition: [0, 0.5],
    type: "edge-y",
    cursor: "ns-resize",
  },
  {
    id: "bottom",
    normalizedPosition: [0, -0.5],
    type: "edge-y",
    cursor: "ns-resize",
  },
  {
    id: "left",
    normalizedPosition: [-0.5, 0],
    type: "edge-x",
    cursor: "ew-resize",
  },
  {
    id: "right",
    normalizedPosition: [0.5, 0],
    type: "edge-x",
    cursor: "ew-resize",
  },
];

/**
 * Renders resize handlers with "pivot-point" resizing.
 * This version has the corrected component hierarchy and data flow.
 */
const HandlerGroup = ({
  position,
  scale,
  rotation,
  onUpdate,
  onHover,
  setIsResizing,
  isText,
}: HandlerGroupProps) => {
  const dragInfo = useRef({
    pivotPoint: new THREE.Vector3(),
    initialPosition: new THREE.Vector3(),
    initialScale: new THREE.Vector2(),
    initialHandlePosition: new THREE.Vector3(),
    // CHANGED: Store the inverse rotation matrix on drag start
    inverseRotationMatrix: new THREE.Matrix4(),
  }).current;

  // This function is now for LOCAL space calculation
  const getPointInLocalSpace = (
    normalizedPos: [number, number],
    currentScale: [number, number]
  ): THREE.Vector3 =>
    new THREE.Vector3(
      currentScale[0] * normalizedPos[0],
      currentScale[1] * normalizedPos[1],
      0
    );

  const handleDragStart = (handler: HandlerConfig) => {
    setIsResizing(true);

    // The pivot point is opposite the handle, in LOCAL space
    const pivotNormalizedPos: [number, number] = [
      -handler.normalizedPosition[0],
      -handler.normalizedPosition[1],
    ];

    dragInfo.initialPosition.set(...position);
    dragInfo.initialScale.set(...scale);

    // CHANGED: All calculations are now done in the object's local space first
    dragInfo.pivotPoint = getPointInLocalSpace(pivotNormalizedPos, scale);
    dragInfo.initialHandlePosition = getPointInLocalSpace(
      handler.normalizedPosition,
      scale
    );

    // CHANGED: Get the world rotation and invert it to transform movement into local space
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(rotation[2]);
    dragInfo.inverseRotationMatrix.copy(rotationMatrix).invert();
  };

  const handleDrag = (handler: HandlerConfig, movement: THREE.Vector2) => {
    const {
      pivotPoint,
      initialHandlePosition,
      initialScale,
      initialPosition,
      inverseRotationMatrix,
    } = dragInfo;

    // CHANGED: Transform world-space movement vector into the group's local space
    const localMovement = new THREE.Vector3(
      movement.x,
      movement.y,
      0
    ).applyMatrix4(inverseRotationMatrix);

    const currentHandlePosition = new THREE.Vector3()
      .copy(initialHandlePosition)
      .add(localMovement);

    // From here, the logic is very similar, but operates on local-space coordinates
    const newWidth = Math.abs(currentHandlePosition.x - pivotPoint.x);
    const newHeight = Math.abs(currentHandlePosition.y - pivotPoint.y);

    let newScale: [number, number];
    let centerOffset = new THREE.Vector3();

    if (handler.type === "corner") {
      const aspectRatio =
        initialScale.y === 0 ? 1 : initialScale.x / initialScale.y;
      newScale =
        newWidth / aspectRatio > newHeight
          ? [newWidth, newWidth / aspectRatio]
          : [newHeight * aspectRatio, newHeight];

      const pivotNormalizedPos: [number, number] = [
        -handler.normalizedPosition[0],
        -handler.normalizedPosition[1],
      ];
      const newPivotLocalPos = getPointInLocalSpace(
        pivotNormalizedPos,
        newScale
      );

      // The offset is the change in the pivot's local position due to scaling
      centerOffset = new THREE.Vector3().subVectors(
        pivotPoint,
        newPivotLocalPos
      );
    } else if (handler.type === "edge-x") {
      newScale = [newWidth, initialScale.y];
      centerOffset.set(
        (currentHandlePosition.x + pivotPoint.x) / 2,
        0, // Y position doesn't change relative to center
        0
      );
    } else {
      // 'edge-y'
      newScale = [initialScale.x, newHeight];
      centerOffset.set(
        0, // X position doesn't change relative to center
        (currentHandlePosition.y + pivotPoint.y) / 2,
        0
      );
    }

    // CHANGED: Rotate the local center offset back into world space and add to initial position
    const worldCenterOffset = centerOffset.applyMatrix4(
      new THREE.Matrix4().makeRotationZ(rotation[2])
    );
    const newPosition: [number, number, number] = [
      initialPosition.x + worldCenterOffset.x,
      initialPosition.y + worldCenterOffset.y,
      initialPosition.z,
    ];

    onUpdate({
      scale: [Math.max(0.01, newScale[0]), Math.max(0.01, newScale[1])],
      position: newPosition,
    });
  };

  const handleDragEnd = () => {
    setIsResizing(false);
  };

  // CHANGED: The main group now controls position and rotation.
  // The strange division by 12 is kept from your original code.
  return (
    <group
      position={[position[0], position[1], position[2]]}
      rotation={new THREE.Euler(rotation[0], rotation[1], rotation[2])}
    >
      {handlers.map((handler) => {
        if (isText && (handler.id === "top" || handler.id === "bottom")) return;
        // Determine visual scale for edge handlers to make them look like bars
        const visualScale: [number, number, number] = [1, 1, 1];
        if (handler.type === "edge-x") visualScale[1] = 2.5;
        if (handler.type === "edge-y") visualScale[0] = 2.5;

        return (
          <Handler
            key={handler.id}
            // CHANGED: Position handlers in LOCAL space relative to the group's center.
            position={getPointInLocalSpace(handler.normalizedPosition, scale)}
            cursor={handler.cursor}
            // Note: The handler's own scale is for its visual appearance and is separate
            scale={visualScale}
            onHover={onHover}
            onDragStart={() => handleDragStart(handler)}
            onDrag={(movement) => handleDrag(handler, movement)}
            onDragEnd={handleDragEnd}
          />
        );
      })}
    </group>
  );
};

export default HandlerGroup;
