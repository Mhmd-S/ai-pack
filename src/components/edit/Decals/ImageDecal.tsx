import { useSelect } from "@react-three/drei";
import { Image, Container } from "@react-three/uikit";
import RotationHandler from "../Handler/RotationHandler";
import * as THREE from "three";
import { useDecalDrag } from "@/hooks/useDecalDrag";
import HandlerGroup from "../Handler/HandlerGroup";
import { button } from "leva";
import { useControlsDecals } from "@/components/edit/MultiLeva";
import { useState, useEffect, useRef, useMemo } from "react";
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
  const imageContainerRef = useRef<any>(null);
  const imageRef = useRef<any>(null);

  // Update queue ref for useFrame - simplified for corner resizing only
  const pendingUpdateRef = useRef<{
    scale?: [number, number];
    position?: [number, number, number];
  } | null>(null);

  // Determine the dominant plane of the face (same logic as useDecalDrag)
  const { horizontalAxis, verticalAxis, xMultiplier, yMultiplier } =
    useMemo(() => {
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      // If Z is the smallest dimension -> XY plane is dominant (normal along Z)
      if (size.z < size.x && size.z < size.y) {
        return {
          horizontalAxis: 0,
          verticalAxis: 1,
          xMultiplier: Math.cos(initialRotation[1]) > 0 ? 100 : -100,
          yMultiplier: Math.cos(initialRotation[2]) > 0 ? -100 : 100,
        }; // X, Y
      }

      // If Y is the smallest dimension -> XZ plane is dominant (normal along Y)
      if (size.y < size.x && size.y < size.z) {
        return {
          horizontalAxis: 0,
          verticalAxis: 2,
          xMultiplier: Math.cos(initialRotation[0]) > 0 ? 100 : -100,
          yMultiplier: Math.cos(initialRotation[1]) > 0 ? 100 : -100,
        }; // X, Z
      }

      // Otherwise -> YZ plane is dominant (normal along X)
      return {
        horizontalAxis: 2,
        verticalAxis: 1,
        xMultiplier:
          Math.cos(initialRotation[1]) * Math.sign(initialRotation[1]) * -1 > 0
            ? 100
            : -100,
        yMultiplier: Math.cos(initialRotation[2]) > 0 ? -100 : 100,
      }; // Z, Y
    }, []);

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
    rotation: { value: initialRotation },
    delete: button((get) => {
      onDelete(id);
    }),
  };

  const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

  // @ts-ignore - useControlsDecals has incorrect typing for hiddenControls parameter
  const [store, materialProps, set] = useControlsDecals(
    selectedUserDataStores,
    levaConfig
    // @ts-ignore
  ) as [any, any, (props: any) => void];

  const isSelected = !!selectedUserDataStores.find((s) => s === store);

  // Setup userData and dimensions based on aspect ratio
  useEffect(() => {
    if (imageRef.current && imageContainerRef.current) {
      // Set up userData
      imageContainerRef.current.interactionPanel.userData = { store, isDecal: true };

      // Calculate dimensions based on aspect ratio
      const defaultWidth = 1; // 1 unit in 3D space
      const defaultHeight = defaultWidth / aspectRatio;

      const pixelWidth = defaultWidth * 25;
      const pixelHeight = defaultHeight * 25;

      // Set style dimensions
      imageContainerRef.current.setStyle({
        width: pixelWidth,
        height: pixelHeight,
        transformTranslateX: "-50%",
        transformTranslateY: "-50%",
      });

      // Set the scale for the 3D object
      set({
        scale: [pixelWidth / 100, pixelHeight / 100],
      });
    }
  }, [aspectRatio]);

  const { bind, handleRotationUpdate } = useDecalDrag({
    id,
    center: new THREE.Vector3(0, 0, 0),
    boundingBox,
    initialRotation,
    normal,
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
  });

  // Override keyboard delete handler
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName?.toLowerCase();
      const isEditableTarget = !!(
        active &&
        (active.isContentEditable ||
          active.getAttribute("role") === "textbox" ||
          tag === "input" ||
          tag === "textarea" ||
          tag === "select")
      );

      if (isEditableTarget) return;

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
    <Container
      ref={imageContainerRef}
      marginLeft={materialProps.position[horizontalAxis] * xMultiplier}
      marginTop={materialProps.position[verticalAxis] * yMultiplier}
      positionType="absolute"
      inset="50%"
      {...(bindProps() as any)}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        hoverRef.current = true;
      }}
      onPointerOut={() => {
        hoverRef.current = false;
      }}

    >
      <Container
        positionType="relative"
        width="100%"
        height="100%"
        aspectRatio={aspectRatio}
      >
        <Image ref={imageRef} src={url} objectFit="fill" />

        <HandlerGroup
          scale={materialProps.scale}
          position={materialProps.position}
          rotation={materialProps.rotation}
          normal={normal}
          aspectRatio={aspectRatio}
          store={store}
          positionRight={materialProps.position[horizontalAxis] * xMultiplier}
          positionTop={materialProps.position[verticalAxis] * yMultiplier}
          onUpdate={handleUpdate}
          onHover={(hoverState) => (hoverRef.current = hoverState)}
          setIsResizing={setIsResizing}
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
      </Container>
    </Container>
  );
};

export default ImageDecal;
