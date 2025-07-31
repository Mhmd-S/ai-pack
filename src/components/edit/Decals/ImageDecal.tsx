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
      const currentCropScale = newProps.cropScale || null;
      setCropScale(currentCropScale);

      let currentCropPosition: [number, number] | null = null;

      // Calculate crop position based on the resize type and handler
      if (newProps.cropScale && newProps.handlerId && newProps.position) {
        const cropWidth = newProps.cropScale[0];
        const cropHeight = newProps.cropScale[1];
        const imageWidth = materialProps.scale[0];
        const imageHeight = materialProps.scale[1];

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

        // Check if crop extends beyond image bounds for each side
        const exceedingState = {
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

        console.log("[DEBUG] Left Comparison:", {
          "cropBounds.left": cropBounds.left,
          "imageBounds.left": imageBounds.left,
          comparison: `${parseFloat(cropBounds.left.toPrecision(3))} < ${parseFloat(imageBounds.left.toPrecision(3))}`,
          exceeding: exceedingState.left,
        });

        setContainerExceedingImage(exceedingState);

        currentCropPosition = [
          newProps.position[0] / 100,
          newProps.position[1] / 100,
        ];
        setCropPosition(currentCropPosition);
      }
      set({ position: newProps.position });

      // Apply the useEffect logic for cropping when edge resizing
      if (
        currentCropScale &&
        currentCropPosition &&
        imageContainerRef.current &&
        rootRef.current
      ) {
        // Get dimensions in pixels for calculation (assuming 1 unit = 100px)
        let imageWidth = materialProps.scale[0] * 100;
        let imageHeight = materialProps.scale[1] * 100;
        let cropWidth = currentCropScale[0] * 100;
        let cropHeight = currentCropScale[1] * 100;

        // --- Calculate container dimensions ---
        let newImageWidth = Math.max(imageWidth, cropWidth);
        let newImageHeight = Math.max(imageHeight, cropHeight);

        // --- Absolute Position Calculation ---
        // This converts the center-based offset (cropPosition) into a
        // top-left based transformTranslate.
        let transformX =
          imageContainerRef.current.getStyle().transformTranslateX;
        let transformY =
          imageContainerRef.current.getStyle().transformTranslateY;

        if (resizeHandle == "right") {
          if (containerExceedingImage.right) {
            transformY = (cropWidth - imageWidth) / -2;
          }
        }

        if (resizeHandle == "left") {
          if (!containerExceedingImage.left) {
            console.log("leftyyyyyy");
            transformX = (cropWidth - imageWidth) / 1;
          } else {
            console.log("hehehehehehhe");
            transformX = (cropWidth - imageWidth) / -100;
            transformY = (cropWidth - imageWidth) / -2;
          }
        }

        if (resizeHandle == "top") {
          if (!containerExceedingImage.top) {
            transformY =
              (cropHeight - imageHeight) / 2 + currentCropPosition[1] * 2;
          } else {
            transformY =
              (cropHeight - imageHeight) / 2 + currentCropPosition[1] / -1;
            imageContainerRef.current.setStyle({
              height: currentCropScale[1] * 100,
              width: currentCropScale[1] * 100 * aspectRatio,
            });
            rootRef.current.setStyle({
              height: currentCropScale[1] * 100,
              width: currentCropScale[1] * 100 * aspectRatio,
            });
          }
        }

        if (resizeHandle == "bottom") {
          if (!containerExceedingImage.bottom) {
            transformY =
              (cropHeight - imageHeight) / 2 + currentCropPosition[1] / -1;
          } else {
            transformY =
              (cropHeight - imageHeight) / 2 + currentCropPosition[1] * -2;
            imageContainerRef.current.setStyle({
              width: currentCropScale[1] * 100 * aspectRatio,
              height: currentCropScale[1] * 100,
            });
            rootRef.current.setStyle({
              width: currentCropScale[1] * 100 * aspectRatio,
              height: currentCropScale[1] * 100,
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
          width: newImageWidth,
          height: newImageHeight,
          // Apply the calculated absolute offset
          transformTranslateX: transformX,
          transformTranslateY: transformY,
        });
      }
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
