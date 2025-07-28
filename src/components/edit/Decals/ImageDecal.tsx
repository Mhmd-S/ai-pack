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
  const [containerLargerThanImage, setContainerLargerThanImage] = useState({
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
      setCropScale(newProps.cropScale || null);

      // Calculate crop position based on the resize type and handler
      if (newProps.cropScale && newProps.handlerId && newProps.position) {
        const cropWidth = newProps.cropScale[0];
        const cropHeight = newProps.cropScale[1];
        const imageWidth = materialProps.scale[0];
        const imageHeight = materialProps.scale[1];

        let newCropPosition: [number, number] = [0, 0];
          
        if (
          newProps.handlerId === "left" ||
          newProps.handlerId === "top-left" ||
          newProps.handlerId === "bottom-left"
        ) {
          // Left edge: crop position is negative (image extends left of crop center)
          newCropPosition[0] = -(imageWidth - cropWidth) / 2;
        }

        if (
          newProps.handlerId === "right" ||
          newProps.handlerId === "top-right" ||
          newProps.handlerId === "bottom-right"
        ) {
        
          // Right edge: crop position is positive (image extends right of crop center)
          newCropPosition[0] = (imageWidth - cropWidth) / 2;
        }

        if (
          newProps.handlerId === "top" ||
          newProps.handlerId === "top-left" ||
          newProps.handlerId === "top-right"
        ) {
          // Top edge: crop position is positive (image extends above crop center)
          newCropPosition[1] = (imageHeight - cropHeight) / 2;
        }

        if (
          newProps.handlerId === "bottom" ||
          newProps.handlerId === "bottom-left" ||
          newProps.handlerId === "bottom-right"
        ) {
          // Bottom edge: crop position is negative (image extends below crop center)
          newCropPosition[1] = -(imageHeight - cropHeight) / 2;
        }

        setCropPosition(newCropPosition);

        // Detect if crop is expanding beyond image bounds
        // Rectangle A (Image) properties
        const imageCenter = materialProps.position; // [x, y, z]
        
        // Rectangle B (Crop) properties - crop is positioned relative to image center
        const cropCenter: [number, number, number] = [
          imageCenter[0] + newCropPosition[0], // absolute X = image center X + crop offset X
          imageCenter[1] + newCropPosition[1], // absolute Y = image center Y + crop offset Y
          imageCenter[2] // Z remains the same as image
        ];

        // Calculate extents for Image (Rectangle A)
        const imageMinX = imageCenter[0] - imageWidth / 2;
        const imageMaxX = imageCenter[0] + imageWidth / 2;
        const imageMinY = imageCenter[1] - imageHeight / 2;
        const imageMaxY = imageCenter[1] + imageHeight / 2;

        // Calculate extents for Crop (Rectangle B)
        const cropMinX = cropCenter[0] - cropWidth / 2;
        const cropMaxX = cropCenter[0] + cropWidth / 2;
        const cropMinY = cropCenter[1] - cropHeight / 2;
        const cropMaxY = cropCenter[1] + cropHeight / 2;

        // Check for expansion along X-axis
        const xAxisExpansion = (cropMinX < imageMinX) || (cropMaxX > imageMaxX);

        // Check for expansion along Y-axis
        const yAxisExpansion = (cropMinY < imageMinY) || (cropMaxY > imageMaxY);

        // Log the expansion detection results for debugging
        console.log('Crop expansion detection:', {
          xAxisExpansion,
          yAxisExpansion,
          cropBounds: { minX: cropMinX, maxX: cropMaxX, minY: cropMinY, maxY: cropMaxY },
          imageBounds: { minX: imageMinX, maxX: imageMaxX, minY: imageMinY, maxY: imageMaxY },
          cropCenter,
          imageCenter,
          
        });
      }
      set({ position: newProps.position });

      
    }
  };

  useEffect(() => {
    // Guard clause: Only run when cropping is active.
    if (
      !cropScale ||
      !cropPosition ||
      !imageContainerRef.current ||
      !rootRef.current
    ) {
      return;
    }
    
    // Get dimensions in pixels for calculation (assuming 1 unit = 100px)
    let imageWidth = materialProps.scale[0] * 100;
    let imageHeight = materialProps.scale[1] * 100;
    let cropWidth = cropScale[0] * 100;
    let cropHeight = cropScale[1] * 100;

    // --- Calculate container dimensions ---
    let containerWidth = imageWidth;
    let containerHeight = imageHeight;

    // If container is larger than image in any direction, expand the container
    if (containerLargerThanImage.left || containerLargerThanImage.right) {
      containerWidth = Math.max(imageWidth, cropWidth);
    }
    if (containerLargerThanImage.top || containerLargerThanImage.bottom) {
      containerHeight = Math.max(imageHeight, cropHeight);
      containerWidth = Math.max(imageHeight, cropHeight) * aspectRatio;
    }

    // --- Absolute Position Calculation ---
    // This converts the center-based offset (cropPosition) into a
    // top-left based transformTranslate.
    let transformX = imageContainerRef.current.getStyle().transformTranslateX;
    let transformY = imageContainerRef.current.getStyle().transformTranslateY;

    if (resizeHandle == "right") {
      if (containerLargerThanImage.right) {
        transformY = (cropWidth - containerWidth) / 2 + cropPosition[0] * 100;
      }
    }

    if (resizeHandle == "left") {
      if (!containerLargerThanImage.left) {
        transformX = (cropWidth - containerWidth) / 2 + cropPosition[0] * 100;
      } else {
        transformX = (cropWidth - containerWidth) / 2 + cropPosition[0] * -2;
        transformY = (cropWidth - containerWidth) / 2 + cropPosition[0] * -100;
      }
    }

    if (resizeHandle == "top") {
      if (!containerLargerThanImage.top) {
        transformY = (cropHeight - containerHeight) / 2 + cropPosition[1] * 2;
      } else {
        transformY = (cropHeight - containerHeight) / 2 + cropPosition[1] / -1;
        imageContainerRef.current.setStyle({
          height: cropScale[1] * 100,
          width: cropScale[1] * 100 * aspectRatio,
        });
        rootRef.current.setStyle({
          height: cropScale[1] * 100,
          width: cropScale[1] * 100 * aspectRatio,
        });
      }
    }

    if (resizeHandle == "bottom") {
      if (!containerLargerThanImage.bottom) {
        transformY = (cropHeight - containerHeight) / 2 + cropPosition[1] / -1;
      } else {
        transformY = (cropHeight - containerHeight) / 2 + cropPosition[1] * -2;
        imageContainerRef.current.setStyle({
          width: cropScale[1] * 100 * aspectRatio,
          height: cropScale[1] * 100,
        });
        rootRef.current.setStyle({
          width: cropScale[1] * 100 * aspectRatio,
          height: cropScale[1] * 100,
        });
      }
    }

    // 1. Set the size of the cropping frame (the Root)
    rootRef.current.setStyle({
      width: cropWidth,
      height: cropHeight,
    });

    // 2. The image container's size should match the expanded container size
    imageContainerRef.current.setStyle({
      width: containerWidth,
      height: containerHeight,
      // Apply the calculated absolute offset
      transformTranslateX: transformX,
      transformTranslateY: transformY,
    });
  }, [cropScale, cropPosition, materialProps.scale]); // Add materialProps.scale dependency

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
