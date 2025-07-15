import { useDecalDrag } from "@/hooks/useDecalDrag";
import RotationHandler from "../Handler/RotationHandler";

import TextBox from "@/components/edit/Decals/TextBox";
import * as THREE from "three";
import { useState, useEffect } from "react";
import TextHandlerGroup from "../Handler/TextHandlerGroup";
import { button } from "leva";
import { useSelect } from "@react-three/drei";
import { useControlsDecals } from "@/components/edit/MultiLeva";
import { useFonts } from "@/hooks/use-fonts";

interface TextDecalProps {
  id: string;
  text: string;
  meshRef: React.RefObject<THREE.Mesh>;
  initialRotation: [number, number, number];
  center: THREE.Vector3;
  boundingBox: THREE.Box3;
  normal: THREE.Vector3;
  onDelete: (id: string) => void;
}

const TextDecal = ({
  id,
  text,
  meshRef,
  initialRotation,
  center,
  boundingBox,
  normal,
  onDelete,
}: TextDecalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHover] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<'corner' | 'edge-x' | 'edge-y' | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const { getAvailableFamilies } = useFonts();

  // Create font options for Leva - convert kebab-case to title case for display
  const fontOptions = getAvailableFamilies().reduce((acc, fontFamily) => {
    const displayName = fontFamily
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    acc[displayName] = fontFamily;
    return acc;
  }, {} as Record<string, string>);

  // Weight options for Leva
  const weightOptions = {
    'Light': 'light',
    'Regular': 'regular', 
    'Bold': 'bold'
  };

  const levaConfig = {
    position: {
      value: [center.x, center.y, center.z],
    },
    scale: {
      value: [0.15, 0.04],
    },
    size: {
      value: 16,
    },
    color: {
      value: "#000000",
    },
    "font family": {
      value: "jost",
      options: fontOptions,
    },
    "font weight": {
      value: "regular",
      options: weightOptions,
    },
    "Align Text": {
      value: "center",
      options: ["left", "center", "right"],
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
    ["position", "scale", "rotation"] as any // Hide scale and rotation controls
  ) as [any, any, (props: any) => void];

  const isSelected = !!selectedUserDataStores.find((s) => s === store);

  const toggleEditing = async () => {
    if (isMoving || isResizing || isRotating || !isSelected)
      return;
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsEditing(!isEditing);
  };

  const { bind, handleRotationUpdate } = useDecalDrag({
    id,
    center,
    boundingBox,
    initialRotation,
    isSelected,
    onDelete,
    materialProps,
    disableDrag: isEditing,
    onUpdate: (props: any) => set(props),
    onPointerDown: toggleEditing,
    disableKeyboardDelete: true,
    isResizing,
    isRotating,
    setIsMoving,
  });

  // Handler for TextHandlerGroup that supports font size changes
  const handleTextUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    size?: number;
  }) => {
    set(newProps);
  };

  // Custom setIsResizing function that also handles resize type
  const setIsResizingWithType = (resizing: boolean, type: 'corner' | 'edge-x' | 'edge-y' | null = null) => {
    setIsResizing(resizing);
    setResizeType(resizing ? type : null);
  };

  useEffect(() => {
    if (isMoving) {
      setIsEditing(false);
    }
  }, [isMoving, isEditing]);

  // Override keyboard delete to not work while editing
  useEffect(() => {
    if (!isSelected) setIsEditing(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !isEditing &&
        isSelected &&
        (event.key === "Delete" || event.key === "Backspace")
      ) {
        event.preventDefault();
        onDelete(id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected, id, onDelete, isEditing]);

  // Create the combined font key from family and weight
  const combinedFontKey = `${materialProps["font family"]}-${materialProps["font weight"]}`;

  return (
    <>
      {/* Visual representation mesh */}
      {/* A interactable interface for the user, the decal itself is too rigid to control directly */}
      {/* The actual editable text */}
      <TextBox
        bind={bind}
        position={[
          materialProps.position[0],
          materialProps.position[1],
          materialProps.position[2],
        ]}
        store={store}
        setIsEditing={setIsEditing}
        rotation={materialProps.rotation}
        scale={[materialProps.scale[0], materialProps.scale[1], 1]}
        initialText={text}
        color={materialProps.color}
        size={materialProps.size}
        fontFamily={combinedFontKey}
        alignText={materialProps["Align Text"]}
        isSelected={isSelected}
        isEditing={isEditing}
        set={set}
        isResizing={isResizing}
        resizeType={resizeType}
        isHovered={hovered}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      />

      {/* Handler group for resize handles */}
      {isSelected && !isEditing && (
        <>
          <TextHandlerGroup
            scale={materialProps.scale}
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            rotation={materialProps.rotation}
            onUpdate={handleTextUpdate}
            onHover={setHover}
            setIsResizing={setIsResizingWithType}
            normal={normal}
            currentSize={materialProps.size}
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
            onHover={setHover}
            setIsRotating={setIsRotating}
          />
        </>
      )}
    </>
  );
};

export default TextDecal;
