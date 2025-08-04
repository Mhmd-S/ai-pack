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

  const cropScale = useRef<[number, number] | null>(null);
  const hoverRef = useRef(false);
  const rootRef = useRef<any>(null);
  const imageContainerRef = useRef<any>(null);
  const imageRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Style state refs for useFrame updates
  const rootStylesRef = useRef<{
    width?: string | number;
    height?: string | number;
  } | null>(null);
  const containerStylesRef = useRef<{
    width?: string | number;
    height?: string | number;
    transformTranslateX?: number;
    transformTranslateY?: number;
  } | null>(null);

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

  const positionOfImage = useRef<[number, number]>([0, 0]);

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
  }, [isMoving, materialProps.position]);

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
      rootStylesRef.current = {
        width: pixelWidth,
        height: pixelHeight,
      };

      containerStylesRef.current = {
        width: pixelWidth,
        height: pixelHeight,
      };
      // Set the actual scale for the 3D object
      set({
        scale: [pixelWidth / 100, pixelHeight / 100],
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
    const imageBounds = {
      left: (positionOfImage.current[0] - imageWidth / 2).toFixed(3),
      right: (positionOfImage.current[0] + imageWidth / 2).toFixed(3),
      top: (positionOfImage.current[1] + imageHeight / 2).toFixed(3),
      bottom: (positionOfImage.current[1] - imageHeight / 2).toFixed(3),
    };

    const cropBounds = {
      left: (positionOfCrop[0] - cropWidth / 2).toFixed(3),
      right: (positionOfCrop[0] + cropWidth / 2).toFixed(3),
      top: (positionOfCrop[1] + cropHeight / 2).toFixed(3),
      bottom: (positionOfCrop[1] - cropHeight / 2).toFixed(3),
    };

    console.log("Crop Bounds", cropBounds);
    console.log("Image Bounds", imageBounds);

    const exceedingEdges = {
      left: imageBounds.left < cropBounds.left,
      right: imageBounds.right < cropBounds.right,
      top: imageBounds.top < cropBounds.top,
      bottom: imageBounds.bottom < cropBounds.bottom,
    };

    return { cropBounds, imageBounds, exceedingEdges };
  };

  const calculateTransformsDelta = (
    (
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
      }
    ) => {
      let transformX =
        imageContainerRef.current?.getStyle().transformTranslateX;
      let transformY =
        imageContainerRef.current?.getStyle().transformTranslateY;


      

      return { transformX, transformY };
    }

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
        cropScale.current = null;
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
          const imageWidth = materialProps.scale[0];
          const imageHeight = materialProps.scale[1];

          // Calculate the new crop position from the overall element's position.
          const newCropPosition: [number, number] = [
            newRootPosition?.[0],
            newRootPosition?.[1],
          ];

          const { exceedingEdges } = calculateBounds(
            newCropPosition,
            imageWidth,
            imageHeight,
            cropWidth,
            cropHeight
          );

          // Calculate pixel dimensions
          const imageWidthPx = imageWidth * 100;
          const imageHeightPx = imageHeight * 100;
          const cropWidthPx = cropWidth * 100;
          const cropHeightPx = cropHeight * 100;

          // New Image Width and Height, takes either the crop or image width/height, depends on which is larger
          const containerWidth = Math.max(imageWidthPx, cropWidthPx);
          const containerHeight = Math.max(imageHeightPx, cropHeightPx);

          console.log("Exceeding Edges", exceedingEdges);

          // Calculate the transform for the image
          const { transformX, transformY } = calculateTransformsDelta(
            newProps.handlerId,
            exceedingEdges,
            cropWidthPx,
            cropHeightPx,
            imageWidthPx,
            imageHeightPx,
            newCropPosition
          );

          // Queue styles for next frame
          rootStylesRef.current = { width: cropWidthPx, height: cropHeightPx };

          containerStylesRef.current = {
            width: containerWidth,
            height: containerHeight,
            transformTranslateX: transformX,
            transformTranslateY: transformY,
          };
        }

        // Update state
        if (newCropScale) {
          cropScale.current = newCropScale;
        }
        set({ position: newRootPosition });
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

    // Apply pending style updates
    if (rootStylesRef.current && rootRef.current) {
      const styles = { ...rootStylesRef.current };
      // Convert numeric values to pixel strings for style application
      if (styles.width !== undefined && typeof styles.width === "number") {
        styles.width = `${styles.width}px`;
      }
      if (styles.height !== undefined && typeof styles.height === "number") {
        styles.height = `${styles.height}px`;
      }
      rootRef.current.setStyle(styles);
      rootStylesRef.current = null;
    }

    if (containerStylesRef.current && imageContainerRef.current) {
      const styles = { ...containerStylesRef.current };
      // Convert numeric values to pixel strings for style application
      if (styles.width !== undefined && typeof styles.width === "number") {
        styles.width = `${styles.width}px`;
      }
      if (styles.height !== undefined && typeof styles.height === "number") {
        styles.height = `${styles.height}px`;
      }
      imageContainerRef.current.setStyle(styles);
      containerStylesRef.current = null;
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
            scale={cropScale.current ? cropScale.current : materialProps.scale}
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
            scale={cropScale.current ? cropScale.current : materialProps.scale}
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
