import { useSelect } from "@react-three/drei";
import { Image, Container, Root } from "@react-three/uikit";
import RotationHandler from "../Handler/RotationHandler";

import * as THREE from "three";
import { useDecalDrag } from "@/hooks/useDecalDrag";
import HandlerGroup from "../Handler/HandlerGroup";
import { button } from "leva";
import { useControlsDecals } from "@/components/edit/MultiLeva";
import { useState, useEffect, useRef } from "react";

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
  const imageRef = useRef<any>(null);

  // Calculate initial dimensions based on image aspect ratio
  const standardWidth = 0.2;
  const standardHeight = 0.2; // Default to square, will be updated when image loads

  const levaConfig = {
    position: {
      value: [center.x, center.y, center.z],
    },
    scale: {
      value: [standardWidth, standardHeight],
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
    if (imageRef.current && imageRef.current.interactionPanel) {
      imageRef.current.interactionPanel.userData = { store, isDecal: true };
    }
  }, []);

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

  // Handler for HandlerGroup that supports image scaling and cropping
  const handleUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    cropScale?: [number, number];
    resizeType: "corner" | "edge-x" | "edge-y";
  }) => {
    if (newProps.resizeType === "corner") {
      // Corner resizing: update actual image scale and clear crop
      setCropScale(null);
      set({ scale: newProps.scale, position: newProps.position });
    } else {
      // Edge resizing: update crop scale and position, keep image scale same
      setCropScale(newProps.cropScale || null);
      set({ position: newProps.position });
    }
  };

  // Custom setIsResizing function that also handles resize type
  const setIsResizingWithType = (
    resizing: boolean,
    type: "corner" | "edge-x" | "edge-y" | null = null
  ) => {
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

  const currentScale = materialProps.scale || [standardWidth, standardHeight];
  const displayScale = cropScale || currentScale;
  
  // Calculate effective image scale for rendering
  const getEffectiveImageScale = (): [number, number] => {
    if (!cropScale) {
      // No cropping, use current scale
      return currentScale;
    }
    
    // When cropping, check if container is larger than original image
    const cropWidth = cropScale[0];
    const cropHeight = cropScale[1];
    const imageWidth = currentScale[0];
    const imageHeight = currentScale[1];
    
    // If crop container is larger than image, scale image to match container exactly
    // If crop container is smaller, keep original image size for cropping
    const scaleX = cropWidth > imageWidth ? cropWidth : imageWidth;
    const scaleY = cropHeight > imageHeight ? cropHeight : imageHeight;
    
    return [scaleX, scaleY];
  };
  
  const effectiveImageScale = getEffectiveImageScale();

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
        <Root>
          <Container
            width={displayScale[0] * 100}
            height={displayScale[1] * 100}
            borderWidth={isSelected ? 0.4 : hovered ? 1 : 0}
            borderColor={isSelected ? "red" : hovered ? "red" : "transparent"}
            overflow="hidden"
          >
            <Image
              src={url}
              width={effectiveImageScale[0] * 100}
              height={effectiveImageScale[1] * 100}
              objectFit="cover"
              opacity={1}
              keepAspectRatio={false}
              ref={imageRef}
            />
          </Container>
        </Root>
      </group>

      {/* Handler group for resize handles */}
      {isSelected && (
        <>
          <HandlerGroup
            scale={displayScale}
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
            scale={displayScale}
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
