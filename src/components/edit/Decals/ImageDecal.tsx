import { useSelect } from "@react-three/drei";
import { Image, Container, Root } from "@react-three/uikit";
import RotationHandler from "../Handler/RotationHandler";
import * as THREE from "three";
import { useDecalDrag } from "@/hooks/useDecalDrag";
import HandlerGroup from "../Handler/HandlerGroup";
import { button } from "leva";
import { useControlsDecals } from "@/components/edit/MultiLeva";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useImageAspectRatio } from "@/hooks/use-image-aspect-ratio";
import { invalidate, useFrame } from "@react-three/fiber";

interface ImageDecalProps {
  url: string;
  id: string;
  initialRotation: [number, number, number];
  normal: THREE.Vector3;
  center: THREE.Vector3;
  boundingBox: THREE.Box3;
  onDelete: (id: string) => void;
}

const ImageDecal = ({
  url,
  id,
  initialRotation,
  center,
  boundingBox,
  normal,
  onDelete,
}: ImageDecalProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const positionOfImage = useRef<[number, number]>([0, 0]);
  const hoverRef = useRef(false);
  const rootRef = useRef<any>(null);
  const imageContainerRef = useRef<any>(null);
  const imageRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Update queue ref for useFrame
  const pendingUpdateRef = useRef<{
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
    handlerId?: string;
  } | null>(null);

  const { aspectRatio, isLoading: isLoadingAspectRatio } = useImageAspectRatio(
    url,
    1
  );

  const levaConfig = {
    position: {
      value: [center.x, center.y, center.z],
    },
    scale: {
      value: [0, 0],
    },
    imageScale: {
      value: [0, 0],
    },
    refrenceScale: {
      value: [0, 0],
    },
    rotation: { value: initialRotation, render: () => false },
    delete: button((get) => {
      onDelete(id);
    }),
  };

  const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

  // @ts-ignore - useControlsDecals has incorrect typing for hiddenControls parameter
  const [store, materialProps, set] = useControlsDecals(
    selectedUserDataStores,
    levaConfig,
    // @ts-ignore
    ["rotation"] // Hide rotation controls
  ) as [any, any, (props: any) => void];

  const isSelected = !!selectedUserDataStores.find((s) => s === store);

  useEffect(() => {
    if (!isMoving) return;

    const imageRelativePos = imageContainerRef.current?.center.v;

    if (!imageRelativePos) return;

    const imagePositionRelativeToCrop = [
      parseFloat(
        (materialProps.position[0] + imageRelativePos[0] / 100).toFixed(3)
      ),
      parseFloat(
        (materialProps.position[1] + imageRelativePos[1] / 100).toFixed(3)
      ),
    ];

    positionOfImage.current = imagePositionRelativeToCrop as [number, number];
  }, [
    isMoving,
    materialProps.position,
    materialProps.scale,
    materialProps.imageScale,
  ]);

  // Combined effect for setting up userData and dimensions
  useEffect(() => {
    if (imageRef.current && imageContainerRef.current) {
      // Set up userData
      imageRef.current.interactionPanel.userData = { store, isDecal: true };

      // Calculate dimensions based on aspect ratio
      const defaultWidth = 1; // 1 unit in 3D space
      const defaultHeight = defaultWidth / aspectRatio;

      const pixelWidth = defaultWidth * 25;
      const pixelHeight = defaultHeight * 25;

      // Queue style updates for useFrame
      rootRef.current.setStyle({
        width: pixelWidth,
        height: pixelHeight,
      });

      imageContainerRef.current.setStyle({
        width: pixelWidth,
        height: pixelHeight,
      });

      // Set the actual scale for the 3D object

      const imageRelativePos = imageContainerRef.current?.center.v;

      if (!imageRelativePos) return;

      const imagePositionRelativeToCrop = [
        parseFloat(
          (materialProps.position[0] + imageRelativePos[0] / 100).toFixed(3)
        ),
        parseFloat(
          (materialProps.position[1] + imageRelativePos[1] / 100).toFixed(3)
        ),
      ];

      positionOfImage.current = imagePositionRelativeToCrop as [number, number];

      set({
        scale: [pixelWidth / 100, pixelHeight / 100],
        imageScale: [pixelWidth / 100, pixelHeight / 100],
        refrenceScale: [pixelWidth / 100, pixelHeight / 100],
      });
    }
  }, [aspectRatio]);

  const { bind, handleRotationUpdate } = useDecalDrag({
    id,
    center,
    boundingBox,
    initialRotation,
    isSelected,
    onDelete,
    materialProps,
    onUpdate: (props: any) => set(props),
    disableKeyboardDelete: true,
    isResizing,
    isRotating,
    setIsMoving,
  });

  const bindProps = () => {
    if (isSelected) {
      return { ...bind() };
    }
    return {};
  };

  const calculateBounds = (
    positionOfCrop: [number, number],
    imageWidth: number,
    imageHeight: number,
    cropWidth: number,
    cropHeight: number
  ) => {
    const imageBoundsToRefrence = {
      left: parseFloat(
        (positionOfImage.current[0] - imageWidth / 2).toFixed(3)
      ),
      right: parseFloat(
        (positionOfImage.current[0] + imageWidth / 2).toFixed(3)
      ),
      top: parseFloat(
        (positionOfImage.current[1] + imageHeight / 2).toFixed(3)
      ),
      bottom: parseFloat(
        (positionOfImage.current[1] - imageHeight / 2).toFixed(3)
      ),
    };

    const imageBounds = {
      left: parseFloat(
        (positionOfImage.current[0] - imageWidth / 2).toFixed(3)
      ),
      right: parseFloat(
        (positionOfImage.current[0] + imageWidth / 2).toFixed(3)
      ),
      top: parseFloat(
        (positionOfImage.current[1] + imageHeight / 2).toFixed(3)
      ),
      bottom: parseFloat(
        (positionOfImage.current[1] - imageHeight / 2).toFixed(3)
      ),
    };

    const cropBounds = {
      left: parseFloat((positionOfCrop[0] - cropWidth / 2).toFixed(3)),
      right: parseFloat((positionOfCrop[0] + cropWidth / 2).toFixed(3)),
      top: parseFloat((positionOfCrop[1] + cropHeight / 2).toFixed(3)),
      bottom: parseFloat((positionOfCrop[1] - cropHeight / 2).toFixed(3)),
    };

    const exceedingEdges = {
      left: imageBounds.left > cropBounds.left,
      right: imageBounds.right < cropBounds.right,
      top: imageBounds.top > cropBounds.top,
      bottom: imageBounds.bottom < cropBounds.bottom,
    };

    return { cropBounds, imageBounds, exceedingEdges, imageBoundsToRefrence };
  };

  const calculateTransformsDelta = (
    imageBounds: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    },
    cropBounds: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    },
    exceedingEdges: {
      left: boolean;
      right: boolean;
      top: boolean;
      bottom: boolean;
    },
    handlerId: string
  ) => {
    let transformX =
      imageContainerRef.current?.getStyle().transformTranslateX || 0;
    let transformY =
      imageContainerRef.current?.getStyle().transformTranslateY || 0;

    if (exceedingEdges.left || exceedingEdges.right) {
      transformY = (imageBounds.bottom - cropBounds.bottom) * -100;
    }
    if (!exceedingEdges.left && handlerId === "left") {
      transformX = (cropBounds.left - imageBounds.left) * -100;
    }

    return { transformX, transformY };
  };

  const handleUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
    handlerId?: string;
  }) => {
    // Queue the update to be processed in useFrame
    pendingUpdateRef.current = newProps;
  };

  // Custom setIsResizing function that also handles resize type
  const setIsResizingWithType = (resizing: boolean, handleId?: string) => {
    setIsResizing(resizing);
  };

  // Use useFrame to update refs directly instead of binding reactive state
  useFrame(() => {
    // Process pending updates
    if (pendingUpdateRef.current && materialProps) {
      const newProps = pendingUpdateRef.current;

      if (newProps.resizeType === "corner") {
        // Corner resizing: update actual image scale and clear crop
        // Get the scale of transformation for the scale and apply it to the refrence scale
        set({ scale: newProps.scale, position: newProps.position });
      } else {
        // Edge resizing: update crop scale and position, keep image scale same
        const newCropScale = newProps.cropScale || null;

        // Root Container Position relative to its container.
        const newRootPosition = [
          newProps.position?.[0],
          newProps.position?.[1],
        ];

        // Only proceed with crop calculations if a crop scale is provided.
        if (
          newCropScale &&
          newProps.handlerId &&
          newRootPosition &&
          imageContainerRef.current
        ) {
          // Calculate dimensions
          const cropWidth = newCropScale[0];
          const cropHeight = newCropScale[1];
          const imageWidth = materialProps.imageScale[0];
          const imageHeight = materialProps.imageScale[1];

          // Calculate the new crop position from the overall element's position.
          const newCropPosition: [number, number] = [
            newRootPosition?.[0] || 0,
            newRootPosition?.[1] || 0,
          ];

          const {
            exceedingEdges,
            cropBounds,
            imageBoundsToRefrence,
            imageBounds,
          } = calculateBounds(
            newCropPosition,
            materialProps.refrenceScale[0],
            materialProps.refrenceScale[1],
            cropWidth,
            cropHeight
          );

          // Calculate pixel dimensions
          const imageWidthPx = imageWidth * 100;
          const imageHeightPx = imageHeight * 100;
          const cropWidthPx = cropWidth * 100;
          const cropHeightPx = cropHeight * 100;

          let newImageWidth = imageWidthPx;
          let newImageHeight = imageHeightPx;

          let oppositeEdge = newProps.handlerId === "left" ? "right" : "left";

          // Check if the handler is not the one that is exceeding the edge
          if (
            exceedingEdges[newProps.handlerId as keyof typeof exceedingEdges] &&
            !exceedingEdges[oppositeEdge as keyof typeof exceedingEdges]
          ) {

            const offset = (imageBoundsToRefrence[
              oppositeEdge as keyof typeof imageBoundsToRefrence
            ] -
              cropBounds[oppositeEdge as keyof typeof cropBounds]);

            newImageWidth =
              Math.max(imageWidthPx + (offset * (newProps.handlerId === "left" ? 1 : -1)*2), cropWidthPx);

            newImageHeight =
              Math.max((imageWidthPx + offset) / aspectRatio, cropHeightPx);
          }

          if (
            exceedingEdges[newProps.handlerId as keyof typeof exceedingEdges] &&
            exceedingEdges[oppositeEdge as keyof typeof exceedingEdges]
          ) {
            newImageWidth = cropWidthPx;
            newImageHeight = cropHeightPx;
          }

          // Calculate the transform for the image
          const { transformX, transformY } = calculateTransformsDelta(
            imageBounds,
            cropBounds,
            exceedingEdges,
            newProps.handlerId
          );

          // Queue styles for next frame
          rootRef.current.setStyle({
            width: cropWidthPx,
            height: cropHeightPx,
          });

          imageContainerRef.current.setStyle({
            width: newImageWidth,
            height: newImageWidth,
            transformTranslateX: 0,
            transformTranslateY: 0,
          });

          set({
            position: newRootPosition,
            scale: newCropScale,
            imageScale: [newImageWidth / 100, newImageHeight / 100],
          });
        }
      }

      // Clear the pending update
      pendingUpdateRef.current = null;
    }

    if (groupRef.current && materialProps) {
      // Update group position and rotation directly
      groupRef.current.position.set(
        materialProps.position[0],
        materialProps.position[1],
        materialProps.position[2]
      );
      groupRef.current.rotation.set(
        materialProps.rotation[0],
        materialProps.rotation[1],
        materialProps.rotation[2]
      );
    }
  });

  // Override keyboard delete handler
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSelected && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        onDelete(id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected, id, onDelete]);

  return (
    <>
      <group
        ref={groupRef}
        {...bindProps()}
        userData={{ store }}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          hoverRef.current = true;
        }}
        onPointerOut={() => {
          hoverRef.current = false;
        }}
      >
        <Root ref={rootRef} overflow="hidden" positionType="relative">
          <Container ref={imageContainerRef} positionType="absolute">
            <Image
              ref={imageRef}
              aspectRatio={aspectRatio}
              width="100%"
              height="100%"
              positionType="relative"
              src={url}
              objectFit="fill"
            />
          </Container>
        </Root>
      </group>

      {/* Handler group for resize handles */}
      {isSelected && (
        <>
          <HandlerGroup
            scale={materialProps.scale}
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            rotation={materialProps.rotation}
            onUpdate={handleUpdate}
            onHover={(hoverState) => (hoverRef.current = hoverState)}
            setIsResizing={setIsResizingWithType}
            normal={normal}
          />
          <RotationHandler
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            scale={materialProps.scale}
            rotation={materialProps.rotation}
            normal={normal}
            onUpdate={handleRotationUpdate}
            onHover={(hoverState) => (hoverRef.current = hoverState)}
            setIsRotating={setIsRotating}
          />
        </>
      )}
    </>
  );
};

export default ImageDecal;
