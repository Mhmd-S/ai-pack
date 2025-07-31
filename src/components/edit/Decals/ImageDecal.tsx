import { useSelect } from "@react-three/drei";
import { Image, Container, Root } from "@react-three/uikit";
import RotationHandler from "../Handler/RotationHandler";
import * as THREE from "three";
import { useDecalDrag } from "@/hooks/useDecalDrag";
import HandlerGroup from "../Handler/HandlerGroup";
import { button } from "leva";
import { useControlsDecals } from "@/components/edit/MultiLeva";
import { useState, useEffect, useRef } from "react";
import { useImageAspectRatio } from "@/hooks/use-image-aspect-ratio";

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
  const [hovered, setHover] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [cropScale, setCropScale] = useState<[number, number] | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [containerExceedingImage, setContainerExceedingImage] = useState({
    left: false,
    right: false,
    top: false,
    bottom: false,
  });

  const rootRef = useRef<any>(null);
  const imageContainerRef = useRef<any>(null);
  const imageRef = useRef<any>(null);

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

      // Set both root and container to the same absolute dimensions
      rootRef.current.setStyle({
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      });

      imageContainerRef.current.setStyle({
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      });

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
  });

  const bindProps = () => {
    if (isSelected) {
      return { ...bind() };
    }
    return {};
  };

  // Add state to track crop position
  const [cropPosition, setCropPosition] = useState<[number, number] | null>(
    null
  );

  // Update the handleUpdate function to track crop position
  const handleUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
    handlerId?: string;
  }) => {
    if (newProps.resizeType === "corner") {
      // Corner resizing: update actual image scale and clear crop
      setCropScale(null);
      setCropPosition(null);
      set({ scale: newProps.scale, position: newProps.position });
    } else {
      // Edge resizing: update crop scale and position, keep image scale same

      // --- 1. Derive New Values from Props ---
      // Use local variables for all calculations. State will be updated once at the end.
      const newCropScale = newProps.cropScale || null;
      const newPosition = newProps.position;
      let newCropPosition: [number, number] | null = null;
      let newExceedingState = null;

      // Only proceed with crop calculations if a crop scale is provided.
      if (newCropScale && newProps.handlerId && newPosition) {
        // --- 2. Calculate Derived State and Dimensions ---
        const cropWidth = newCropScale[0];
        const cropHeight = newCropScale[1];
        const imageWidth = materialProps.scale[0];
        const imageHeight = materialProps.scale[1];

        // Calculate the new crop position from the overall element's position.
        newCropPosition = [newPosition[0] / 100, newPosition[1] / 100];

        // Calculate bounds to check if the crop container exceeds the image.
        const cropBounds = {
          left: -cropWidth / 2,
          right: cropWidth / 2,
          top: cropHeight / 2,
          bottom: -cropHeight / 2,
        };

        const imageBounds = {
          left: materialProps.position[0] - imageWidth / 2,
          right: materialProps.position[0] + imageWidth / 2,
          top: materialProps.position[1] + imageHeight / 2,
          bottom: materialProps.position[1] - imageHeight / 2,
        };

        // Determine which sides of the crop area are outside the image bounds.
        // Using toPrecision to avoid floating point inaccuracies.
        newExceedingState = {
          left:
            parseFloat(cropBounds.left.toPrecision(3)) <
            parseFloat(imageBounds.left.toPrecision(3)),
          right:
            parseFloat(cropBounds.right.toPrecision(3)) >
            parseFloat(imageBounds.right.toPrecision(3)),
          top:
            parseFloat(cropBounds.top.toPrecision(3)) >
            parseFloat(imageBounds.top.toPrecision(3)),
          bottom:
            parseFloat(cropBounds.bottom.toPrecision(3)) <
            parseFloat(imageBounds.bottom.toPrecision(3)),
        };

        // --- 3. Calculate Transform for Visual Correction ---
        // This section adjusts the image's position within its container to keep it
        // anchored correctly during a crop-resize.

        const imageWidthPx = imageWidth * 100;
        const imageHeightPx = imageHeight * 100;
        const cropWidthPx = cropWidth * 100;
        const cropHeightPx = cropHeight * 100;

        const containerWidth = Math.max(imageWidthPx, cropWidthPx);
        const containerHeight = Math.max(imageHeightPx, cropHeightPx);

        // Start with the existing transforms and modify them.
        let transformX =
          imageContainerRef.current.getStyle().transformTranslateX;
        let transformY =
          imageContainerRef.current.getStyle().transformTranslateY;

        // Note: The logic below seems highly specific to your UI's anchor points.
        // The calculations are preserved from the original code.
        if (resizeHandle === "right") {
          if (newExceedingState.right) {
            transformY = (cropWidthPx - imageWidthPx) / -2;
          }
        }

        if (resizeHandle === "left") {
          if (!newExceedingState.left) {
            transformX = (cropWidthPx - imageWidthPx) / 2;
          } else {
            transformX = (cropWidthPx - imageWidthPx) / -100; // This seems unusual, verify if intended
            transformY = (cropWidthPx - imageWidthPx) / -2;
          }
        }

        if (resizeHandle === "top") {
          if (!newExceedingState.top) {
            transformY =
              (cropHeightPx - imageHeightPx) / 2 + newCropPosition[1] * 2;
          } else {
            transformY =
              (cropHeightPx - imageHeightPx) / 2 - newCropPosition[1];
          }
          // This logic maintains aspect ratio when resizing vertically
          rootRef.current.setStyle({
            height: cropHeightPx,
            width: cropHeightPx * aspectRatio,
          });
        }

        if (resizeHandle === "bottom") {
          if (!newExceedingState.bottom) {
            transformY =
              (cropHeightPx - imageHeightPx) / 2 - newCropPosition[1];
          } else {
            transformY =
              (cropHeightPx - imageHeightPx) / 2 + newCropPosition[1] * -2;
          }
          // This logic maintains aspect ratio when resizing vertically
          rootRef.current.setStyle({
            width: cropHeightPx * aspectRatio,
            height: cropHeightPx,
          });
        }

        // --- 4. Apply Styles (Side Effects) ---
        // Update the DOM elements via refs with the final calculated values.

        // 1. Set the size of the cropping frame (the Root)
        rootRef.current.setStyle({
          width: cropWidthPx,
          height: cropHeightPx,
        });

        // 2. The image container's size and position
        imageContainerRef.current.setStyle({
          width: containerWidth,
          height: containerHeight,
          transformTranslateX: transformX,
          transformTranslateY: transformY,
        });
      }

      // --- 5. Commit State Updates ---
      // Finally, update all relevant state values once all calculations are complete.
      if (newCropScale) setCropScale(newCropScale);
      if (newCropPosition) setCropPosition(newCropPosition);
      if (newExceedingState) setContainerExceedingImage(newExceedingState);
      set({ position: newPosition });
    }
  };

  // Custom setIsResizing function that also handles resize type
  const setIsResizingWithType = (resizing: boolean, handleId?: string) => {
    setIsResizing(resizing);
    setResizeHandle(resizing ? (handleId ?? null) : null);
  };

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
        {...bindProps()}
        position={[
          materialProps.position[0],
          materialProps.position[1],
          materialProps.position[2],
        ]}
        rotation={
          new THREE.Euler(
            materialProps.rotation[0],
            materialProps.rotation[1],
            materialProps.rotation[2]
          )
        }
        userData={{ store }}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <Root
          ref={rootRef}
          borderWidth={isSelected || hovered ? 0.1 : 0}
          borderColor={"red"}
          overflow="hidden"
          positionType="relative"
        >
          <Container
            ref={imageContainerRef}
            positionType="absolute"
            borderColor={"blue"}
            borderWidth={0.1}
          >
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
            scale={cropScale ? cropScale : materialProps.scale}
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            rotation={materialProps.rotation}
            onUpdate={handleUpdate}
            onHover={setHover}
            setIsResizing={setIsResizingWithType}
            normal={normal}
          />
          <RotationHandler
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            scale={cropScale ? cropScale : materialProps.scale}
            rotation={materialProps.rotation}
            normal={normal}
            onUpdate={handleRotationUpdate}
            onHover={setHover}
            setIsRotating={setIsRotating}
          />
        </>
      )}
    </>
  );
};

export default ImageDecal;
