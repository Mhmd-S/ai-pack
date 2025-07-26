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
  const prevCropScale = useRef<[number, number] | null>(null);
  const imageRef = useRef<any>(null);

  const { aspectRatio, isLoading: isLoadingAspectRatio } = useImageAspectRatio(
    url,
    1
  );

  // This effect updates the previous cropScale after every change
  useEffect(() => {
    if (cropScale) {
      prevCropScale.current = cropScale;
    }
  }, [cropScale]);

  // This calculates the difference between the current and previous cropScale
  // Logic works, but we got to change what metrics we use and how we calculate the difference

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
  const prevCropPosition = useRef<[number, number] | null>(null);
  const accumulatedOffset = useRef<[number, number]>([0, 0]);

  // Update the handleUpdate function to track crop position
  const handleUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
    handlerId?: string;
    handlerPosition?: [number, number];
  }) => {
    if (newProps.resizeType === "corner") {
      // Corner resizing: update actual image scale and clear crop
      setCropScale(null);
      setCropPosition(null);
      // Reset accumulated offset when switching back to corner resizing
      accumulatedOffset.current = [0, 0];
      set({ scale: newProps.scale, position: newProps.position });
    } else {
      // Edge resizing: update crop scale and position, keep image scale same
      setCropScale(newProps.cropScale || null);

      // Calculate crop position based on the resize type and handler
      if (newProps.cropScale && newProps.handlerId) {
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
          if (
            newProps.handlerId === "left" &&
            newProps.handlerPosition &&
            imageWidth * -0.5 > newProps.handlerPosition.x
          ) {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              left: true,
            }));
          } else {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              left: false,
            }));
          }
          // Left edge: crop position is negative (image extends left of crop center)
          newCropPosition[0] = -(imageWidth - cropWidth) / 2;
        }

        if (
          newProps.handlerId === "right" ||
          newProps.handlerId === "top-right" ||
          newProps.handlerId === "bottom-right"
        ) {
          if (
            newProps.handlerId === "right" &&
            newProps.handlerPosition &&
            imageWidth * 0.5 < newProps.handlerPosition.x
          ) {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              right: true,
            }));
          } else {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              right: false,
            }));
          }
          // Right edge: crop position is positive (image extends right of crop center)
          newCropPosition[0] = (imageWidth - cropWidth) / 2;
        }

        if (
          newProps.handlerId === "top" ||
          newProps.handlerId === "top-left" ||
          newProps.handlerId === "top-right"
        ) {
          if (
            newProps.handlerId === "top" &&
            newProps.handlerPosition &&
            imageHeight * 0.5 < newProps.handlerPosition.y
          ) {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              top: true,
            }));
          } else {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              top: false,
            }));
          }
          // Top edge: crop position is positive (image extends above crop center)
          newCropPosition[1] = (imageHeight - cropHeight) / 2;
        }

        if (
          newProps.handlerId === "bottom" ||
          newProps.handlerId === "bottom-left" ||
          newProps.handlerId === "bottom-right"
        ) {
          if (
            newProps.handlerId === "bottom" &&
            newProps.handlerPosition &&
            imageHeight * -0.5 > newProps.handlerPosition.y
          ) {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              bottom: true,
            }));
          } else {
            setContainerLargerThanImage((prevState) => ({
              ...prevState,
              bottom: false,
            }));
          }
          // Bottom edge: crop position is negative (image extends below crop center)
          newCropPosition[1] = -(imageHeight - cropHeight) / 2;
        }

        setCropPosition(newCropPosition);
      }

      set({ position: newProps.position });
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

  useEffect(() => {
    if (
      !cropScale ||
      !prevCropPosition.current ||
      !cropPosition ||
      !imageContainerRef.current ||
      !rootRef.current
    ) {
      return;
    }

    let scaleX;
    let scaleY;

    if (
      containerLargerThanImage.left ||
      containerLargerThanImage.right ||
      containerLargerThanImage.top ||
      containerLargerThanImage.bottom
    ) {
      scaleX = cropScale[0];
      scaleY = cropScale[1];
    } else {
      scaleX = materialProps.scale[0];
      scaleY = materialProps.scale[1];
    }

    imageContainerRef.current.setStyle({
      width: scaleX * 100,
      height: scaleY * 100,
    });

    // Calculate the new offset difference from previous position
    const offsetDiff: [number, number] = [
      cropPosition[0] - prevCropPosition.current[0],
      cropPosition[1] - prevCropPosition.current[1],
    ];

    if (resizeHandle == "right") {
      if (containerLargerThanImage.right) {
        accumulatedOffset.current[0] -= offsetDiff[0];
        accumulatedOffset.current[1] += offsetDiff[0] * 100;
      }
    }

    if (resizeHandle == "left") {
      if (!containerLargerThanImage.left) {
        accumulatedOffset.current[0] += offsetDiff[0] * 200;
      } else {
        accumulatedOffset.current[1] -= offsetDiff[0] * 100;
      }
    }

    if (resizeHandle == "top") {
      if (!containerLargerThanImage.top) {
        accumulatedOffset.current[1] -= offsetDiff[1] * 200;
      } else {
        accumulatedOffset.current[0] += offsetDiff[1] * 100;
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
        accumulatedOffset.current[1] = offsetDiff[1] * 100;
      } else {
        accumulatedOffset.current[0] -= offsetDiff[1] * 100;
        imageContainerRef.current.setStyle({
          width: scaleY * 100 * aspectRatio,
          height: scaleY * 100,
        });
        rootRef.current.setStyle({
          width: scaleY * 100 * aspectRatio,
          height: scaleY * 100,
        });
      }
    }

    console.log(accumulatedOffset.current);

    // Apply the accumulated offset to the image container transform
    imageContainerRef.current.setStyle({
      transformTranslateX: accumulatedOffset.current[0],
      transformTranslateY: accumulatedOffset.current[1],
    });

    rootRef.current.setStyle({
      width: cropScale[0] * 100,
      height: cropScale[1] * 100,
    });
  }, [cropScale, cropPosition]);

  // Update the effect that tracks previous values
  useEffect(() => {
    if (cropPosition) {
      prevCropPosition.current = cropPosition;
    }
  }, [cropPosition]);

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
