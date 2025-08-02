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

  const cropScale = useRef<[number, number] | null>(null);
  const hoverRef = useRef(false);
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

  const calculateBounds = useCallback(
    (
      positionOfCrop: [number, number],
      positionOfImage: [number, number],
      imageWidth: number,
      imageHeight: number,
      cropWidth: number,
      cropHeight: number
    ) => {
      // Transforming the positin of Image to the parent of the crop
      const imagePositionRelativeToCrop = [
        parseFloat((positionOfCrop[0] + positionOfImage[0] / 100).toFixed(3)),
        parseFloat((positionOfCrop[1] + positionOfImage[1] / 100).toFixed(3)),
      ];

      const imageBounds = {
        left: (imagePositionRelativeToCrop[0] - imageWidth / 2).toFixed(3),
        right: (imagePositionRelativeToCrop[0] + imageWidth / 2).toFixed(3),
        top: (imagePositionRelativeToCrop[1] + imageHeight / 2).toFixed(3),
        bottom: (imagePositionRelativeToCrop[1] - imageHeight / 2).toFixed(3),
      };

      const cropBounds = {
        left: (positionOfCrop[0] - cropWidth / 2).toFixed(3),
        right: (positionOfCrop[0] + cropWidth / 2).toFixed(3),
        top: (positionOfCrop[1] + cropHeight / 2).toFixed(3),
        bottom: (positionOfCrop[1] - cropHeight / 2).toFixed(3),
      };

      const exceedingEdges = {
        left: imageBounds.left < cropBounds.left,
        right: imageBounds.right > cropBounds.right,
        top: imageBounds.top > cropBounds.top,
        bottom: imageBounds.bottom < cropBounds.bottom,
      };

      return { cropBounds, imageBounds, exceedingEdges };
    },
    []
  );

  const calculateTransformsDelta = useCallback(
    (
      resizeHandle: string | null,
      exceedingEdges: any,
      cropWidthPx: number,
      cropHeightPx: number,
      imageWidthPx: number,
      imageHeightPx: number,
      newCropPosition: [number, number]
    ) => {
      let transformX = 0;
      let transformY = 0;

      if (resizeHandle === "left") {
        if (exceedingEdges.left) {
          // Move the image upwards
          transformY = (cropWidthPx - imageWidthPx) * -50;
        }

        if (!exceedingEdges.right) {
          transformX = (cropWidthPx - imageWidthPx) * 50;
        }
      }

      if (resizeHandle === "right") {
        if (exceedingEdges.right) {
          // Move the image downwards
          transformY = (cropWidthPx - imageWidthPx) * -50;
        }
      }

      if (resizeHandle === "top") {
        if (!exceedingEdges.top) {
          transformY =
            (cropHeightPx - imageHeightPx) / 2 + newCropPosition[1] * 2;
        } else {
          transformY = (cropHeightPx - imageHeightPx) / 2 - newCropPosition[1];
        }
      }

      if (resizeHandle === "bottom") {
        if (!exceedingEdges.bottom) {
          transformY = (cropHeightPx - imageHeightPx) / 2 - newCropPosition[1];
        } else {
          transformY =
            (cropHeightPx - imageHeightPx) / 2 + newCropPosition[1] * -2;
        }
      }

      return { transformX, transformY };
    },
    []
  );

  // Batch DOM updates to avoid multiple manipulations
  const batchUpdateStyles = useCallback(
    (rootStyles: any, containerStyles: any) => {
      // Use requestAnimationFrame to batch DOM updates
      requestAnimationFrame(() => {
        if (rootRef.current) {
          rootRef.current.setStyle(rootStyles);
        }
        if (imageContainerRef.current) {
          imageContainerRef.current.setStyle(containerStyles);
        }
      });
    },
    []
  );

  const handleUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
    handlerId?: string;
  }) => {
    if (newProps.resizeType === "corner") {
      // Corner resizing: update actual image scale and clear crop
      cropScale.current = null;
      set({ scale: newProps.scale, position: newProps.position });
    } else {
      // Edge resizing: update crop scale and position, keep image scale same
      const newCropScale = newProps.cropScale || null;

      // Root Container Position relative to its container.
      const newRootPosition = [newProps.position?.[0], newProps.position?.[1]];

      // Only proceed with crop calculations if a crop scale is provided.
      if (newCropScale && newProps.handlerId && newRootPosition) {
        // Calculate dimensions
        const cropWidth = newCropScale[0];
        const cropHeight = newCropScale[1];
        const imageWidth = materialProps.scale[0];
        const imageHeight = materialProps.scale[1];

        // Calculate the new crop position from the overall element's position.
        const newCropPosition: [number, number] = [
          parseFloat((newRootPosition?.[0]).toFixed(3)),
          parseFloat((newRootPosition?.[1]).toFixed(3)),
        ];

        const { exceedingEdges } = calculateBounds(
          newCropPosition,
          imageContainerRef.current.center.v,
          imageWidth,
          imageHeight,
          cropWidth,
          cropHeight
        );

        // const { transformX, transformY } = calculateTransformsDelta(
        //   resizeHandle,
        //   exceedingEdges,
        //   cropWidth,
        //   cropHeight,
        //   imageWidth,
        //   imageHeight,
        //   newCropPosition
        // );

        // Calculate pixel dimensions
        const imageWidthPx = imageWidth * 100;
        const imageHeightPx = imageHeight * 100;
        const cropWidthPx = cropWidth * 100;
        const cropHeightPx = cropHeight * 100;

        // New Image Width and Height, takes either the crop or image width/height, depends on which is larger
        const containerWidth = Math.max(imageWidthPx, cropWidthPx);
        const containerHeight = Math.max(imageHeightPx, cropHeightPx);

        // Prepare styles for batching
        const rootStyles: any = { width: cropWidthPx, height: cropHeightPx };
        const containerStyles: any = {
          width: containerWidth,
          height: containerHeight,
          transformTranslateX: 0,
          transformTranslateY: 0,
        };

        // Handle special cases for top/bottom resizing
        // if (resizeHandle === "top") {
        //   rootStyles.height = cropHeightPx;
        //   rootStyles.width = cropHeightPx * aspectRatio;
        // } else if (resizeHandle === "bottom") {
        //   rootStyles.width = cropHeightPx * aspectRatio;
        //   rootStyles.height = cropHeightPx;
        // }

        // Batch DOM updates
        batchUpdateStyles(rootStyles, containerStyles);
      }

      // Debounced state updates to avoid setState in fast events
      if (newCropScale) {
        cropScale.current = newCropScale;
      }
      set({ position: newRootPosition });
    }
  };
  // Custom setIsResizing function that also handles resize type
  const setIsResizingWithType = (resizing: boolean, handleId?: string) => {
    setIsResizing(resizing);
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
          hoverRef.current = true;
        }}
        onPointerOut={() => {
          hoverRef.current = false;
        }}
      >
        <Root
          ref={rootRef}
          borderWidth={isSelected || hoverRef.current ? 0.1 : 0}
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
