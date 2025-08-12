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
  scale: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  normal: THREE.Vector3;
  aspectRatio: number;
  positionRight: number;
  positionTop: number;
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
  scale,
  position,
  rotation,
  normal,
  aspectRatio,
  positionRight,
  positionTop,
  onUpdate,
  onHover,
  setIsResizing,
  store,
}: HandlerGroupProps) => {
  const dragInfo = useRef({
    pivotPoint: new THREE.Vector3(),
    initialPosition: new THREE.Vector3(),
    initialScale: new THREE.Vector2(),
    initialHandlePosition: new THREE.Vector3(),
    inverseRotationMatrix: new THREE.Matrix4(),
    handlerId: "",
  }).current;
  const containerRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.interactionPanel.userData = { store, isDecal: true };
    }
  }, []);

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
    setIsResizing(true, handler.id);

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

    dragInfo.handlerId = handler.id;

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
    } = dragInfo;

    // Check if any rotation is approximately π (3.14)
    const isNearPi = (value: number) =>
      Math.abs(Math.abs(value) - Math.PI) < 0.1;
    const hasNearPiRotation =
      isNearPi(rotation[0]) || isNearPi(rotation[1]) || isNearPi(rotation[2]);

    let localMovement: THREE.Vector3;

    // Sometimes the faces are rotated 180 degrees due to how the model was designed, so we need to invert the movement
    if (hasNearPiRotation) {
      // Create movement vector with inverted axes for rotations near π
      const invertedMovement = new THREE.Vector3(
        isNearPi(rotation[0]) ? movement.x : -movement.x,
        isNearPi(rotation[1]) ? movement.y : -movement.y,
        isNearPi(rotation[2]) ? -0 : 0
      );

      // Apply rotation matrix
      localMovement = invertedMovement.applyMatrix4(
        new THREE.Matrix4()
          .makeRotationFromEuler(
            new THREE.Euler(rotation[0], rotation[1], rotation[2])
          )
          .invert()
      );
    } else {
      // Don't apply rotation matrix
      localMovement = new THREE.Vector3(movement.x, movement.y, 0);
    }

    const currentHandlePosition = new THREE.Vector3()
      .copy(initialHandlePosition)
      .add(localMovement);

    // From here, the logic is very similar, but operates on local-space coordinates
    const newWidth = Math.abs(currentHandlePosition.x - pivotPoint.x);
    const newHeight = Math.abs(currentHandlePosition.y - pivotPoint.y);

    let newScale: [number, number] | undefined;
    let cropScale: [number, number] | undefined;
    let centerOffset = new THREE.Vector3();

    if (handler.type === "corner") {
      // Corner resizing: change the actual image size while maintaining aspect ratio
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
      // Edge-x resizing: keep image size same, only change container width for cropping
      cropScale = [newWidth, initialScale.y];

      centerOffset.set(
        (currentHandlePosition.x + pivotPoint.x) / 2,
        0, // Y position doesn't change relative to center
        0
      );
    } else {
      // Edge-y resizing: keep image size same, only change container height for cropping
      cropScale = [initialScale.x, newHeight];

      centerOffset.set(
        0, // X position doesn't change relative to center
        (currentHandlePosition.y + pivotPoint.y) / 2,
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

    // Create update object based on resize type
    const updateProps: any = {
      position: newPosition,
      resizeType: handler.type,
      handlerId: handler.id,
    };

    if (newScale) {
      // Corner resizing: update actual image scale
      updateProps.scale = [
        Math.max(0.01, newScale[0]),
        Math.max(0.01, newScale[1]),
      ];
      updateProps.handlerPosition = getPointInLocalSpace(
        handler.normalizedPosition,
        updateProps.scale
      );
    } else if (cropScale) {
      // Edge resizing: update crop scale for container clipping
      updateProps.cropScale = cropScale;

      updateProps.handlerPosition = getPointInLocalSpace(
        handler.normalizedPosition,
        updateProps.cropScale
      );
    }

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
