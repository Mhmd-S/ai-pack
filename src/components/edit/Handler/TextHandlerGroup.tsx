import { useRef } from "react";
import * as THREE from "three";
import Handler from "./Handler";

interface HandlerConfig {
  id: string;
  normalizedPosition: [number, number];
  type: "corner" | "edge-x" | "edge-y";
  cursor: string;
}

interface TextHandlerGroupProps {
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
  setIsResizing: (isResizing: boolean, resizeType: 'corner' | 'edge-x' | 'edge-y' | null) => void;
  currentSize: number;
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

const TextHandlerGroup = ({
  position,
  scale,
  rotation,
  normal,
  onUpdate,
  onHover,
  setIsResizing,
  currentSize,
}: TextHandlerGroupProps) => {
  const dragInfo = useRef({
    pivotPoint: new THREE.Vector3(),
    initialPosition: new THREE.Vector3(),
    initialScale: new THREE.Vector2(),
    initialHandlePosition: new THREE.Vector3(),
    inverseRotationMatrix: new THREE.Matrix4(),
    initialSize: 0,
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
    setIsResizing(true, handler.type);

    // The pivot point is opposite the handle, in LOCAL space
    const pivotNormalizedPos: [number, number] = [
      -handler.normalizedPosition[0],
      -handler.normalizedPosition[1],
    ];

    dragInfo.initialPosition.set(...position);
    dragInfo.initialScale.set(...scale);
    dragInfo.initialSize = currentSize;

    // CHANGED: All calculations are now done in the object's local space first
    dragInfo.pivotPoint = getPointInLocalSpace(pivotNormalizedPos, scale);
    dragInfo.initialHandlePosition = getPointInLocalSpace(
      handler.normalizedPosition,
      scale
    );

    // CHANGED: Get the world rotation and invert it to transform movement into local space
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(rotation[0], rotation[1], rotation[2])
    );
    dragInfo.inverseRotationMatrix.copy(rotationMatrix).invert();
  };

  const handleDrag = (handler: HandlerConfig, movement: THREE.Vector2) => {
    const {
      pivotPoint,
      initialHandlePosition,
      initialScale,
      initialPosition,
      inverseRotationMatrix,
      initialSize,
    } = dragInfo;

    const localMovement = new THREE.Vector3(
      movement.x,
      movement.y,
      0
    ).applyMatrix4(inverseRotationMatrix);

    const currentHandlePosition = new THREE.Vector3()
      .copy(initialHandlePosition)
      .add(localMovement);

    const newWidth = Math.abs(currentHandlePosition.x - pivotPoint.x);
    const newHeight = Math.abs(currentHandlePosition.y - pivotPoint.y);

    let newScale: [number, number] | undefined;
    let newSize: number | undefined;
    let centerOffset = new THREE.Vector3();

    if (handler.type === "corner") {
      // For corner handlers: change font size based on diagonal movement
      const diagonalDistance = Math.sqrt(newWidth * newWidth + newHeight * newHeight);
      const initialDiagonal = Math.sqrt(
        initialScale.x * initialScale.x + initialScale.y * initialScale.y
      );
      
      const sizeMultiplier = diagonalDistance / initialDiagonal;
      newSize = Math.max(9, initialSize * sizeMultiplier);

      // Calculate the effective scale change due to font size change
      const fontSizeRatio = newSize / initialSize;

      // Calculate expected new scale synchronously
      // The scale should change proportionally to font size for corner resizing
      const aspectRatio = initialScale.x / initialScale.y;
      const newScaleY = initialScale.y * fontSizeRatio;
      const newScaleX = newScaleY * aspectRatio;
      newScale = [newScaleX, newScaleY];

      // Adjust position calculation to use the new scale instead of font size ratio
      const pivotNormalizedPos: [number, number] = [
        -handler.normalizedPosition[0],
        -handler.normalizedPosition[1],
      ];
      
      const initialPivotOffset = new THREE.Vector3(
        initialScale.x * pivotNormalizedPos[0],
        initialScale.y * pivotNormalizedPos[1],
        0
      );
      
      const newPivotOffset = new THREE.Vector3(
        newScaleX * pivotNormalizedPos[0],
        newScaleY * pivotNormalizedPos[1],
        0
      );
      
      centerOffset = new THREE.Vector3().subVectors(
        initialPivotOffset,
        newPivotOffset
      );
    } else if (handler.type === "edge-x") {
      // For horizontal edge handlers: change scale X only
      newScale = [newWidth, initialScale.y];
      centerOffset.set(
        (currentHandlePosition.x + pivotPoint.x) / 2,
        0, // Y position doesn't change relative to center
        0
      );
    }

    // CHANGED: Rotate the local center offset back into world space and add to initial position
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(rotation[0], rotation[1], rotation[2])
    );
    const worldCenterOffset = centerOffset.applyMatrix4(rotationMatrix);

    const newPositionVec = new THREE.Vector3(...initialPosition).add(
      worldCenterOffset
    );

    const newPosition: [number, number, number] = [
      newPositionVec.x,
      newPositionVec.y,
      newPositionVec.z,
    ];

    // Update with appropriate properties
    const updateProps: any = { position: newPosition };
    
    if (newScale) {
      if (handler.type === "corner") {
        // For corner resizing, update both size and scale synchronously
        updateProps.scale = [Math.max(0.01, newScale[0]), Math.max(0.01, newScale[1])];
        updateProps.size = newSize;
      } else if (handler.type === "edge-x") {
        updateProps.scale = [Math.max(0.01, newScale[0]), scale[1]];
      }
    }

    onUpdate(updateProps);
  };

  const handleDragEnd = () => {
    setIsResizing(false, null);
  };

  return (
    <group
      position={new THREE.Vector3(position[0], position[1], position[2])}
      rotation={new THREE.Euler(rotation[0], rotation[1], rotation[2])}
    >
      {handlers.map((handler) => {
        // Determine visual scale for edge handlers to make them look like bars
        const visualScale: [number, number, number] = [1, 1, 1];
        if (handler.type === "edge-x") visualScale[1] = 2.5;

        return (
          <Handler
            key={handler.id}
            position={getPointInLocalSpace(handler.normalizedPosition, scale)}
            cursor={handler.cursor}
            rotation={rotation}
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

export default TextHandlerGroup; 