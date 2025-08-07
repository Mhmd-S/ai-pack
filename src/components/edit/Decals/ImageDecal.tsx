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
import { useFrame } from "@react-three/fiber";

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

  const hoverRef = useRef(false);
  const rootRef = useRef<any>(null);
  const imageContainerRef = useRef<any>(null);
  const imageRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Update queue ref for useFrame - simplified for corner resizing only
  const pendingUpdateRef = useRef<{
    scale?: [number, number];
    position?: [number, number, number];
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

  // Setup userData and dimensions based on aspect ratio
  useEffect(() => {
    if (imageRef.current && imageContainerRef.current) {
      // Set up userData
      imageRef.current.interactionPanel.userData = { store, isDecal: true };

      // Calculate dimensions based on aspect ratio
      const defaultWidth = 1; // 1 unit in 3D space
      const defaultHeight = defaultWidth / aspectRatio;

      const pixelWidth = defaultWidth * 25;
      const pixelHeight = defaultHeight * 25;

      // Set style dimensions
      rootRef.current.setStyle({
        width: pixelWidth,
        height: pixelHeight,
      });

      imageContainerRef.current.setStyle({
        width: pixelWidth,
        height: pixelHeight,
      });

      // Set the scale for the 3D object
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

  const handleUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
  }) => {
    // Queue the update to be processed in useFrame for corner resizing
    pendingUpdateRef.current = newProps;
  };

  // Use useFrame to update refs directly - simplified for corner resizing only
  useFrame(() => {
    // Process pending updates for corner resizing
    if (pendingUpdateRef.current && materialProps) {
      const newProps = pendingUpdateRef.current;

      // Corner resizing: update scale and position while maintaining aspect ratio
      if (newProps.scale && newProps.position) {
        // Calculate dimensions based on aspect ratio
        const newWidth = newProps.scale[0];
        const newHeight = newWidth / aspectRatio;

        // Update the pixel dimensions
        const pixelWidth = newWidth * 100;
        const pixelHeight = newHeight * 100;

        // Update styles to maintain aspect ratio
        rootRef.current?.setStyle({
          width: pixelWidth,
          height: pixelHeight,
        });

        imageContainerRef.current?.setStyle({
          width: pixelWidth,
          height: pixelHeight,
        });

        // Update the scale and position
        set({
          scale: [newWidth, newHeight],
          position: newProps.position,
        });
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
            setIsResizing={setIsResizing}
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
