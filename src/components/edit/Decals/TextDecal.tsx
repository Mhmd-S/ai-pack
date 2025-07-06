import { useDecalDrag } from "@/hooks/useDecalDrag";
import RotationHandler from "../Handler/RotationHandler";

import TextBox from "@/components/edit/Decals/TextBox";
import * as THREE from "three";
import { useState, useEffect } from "react";
import HandlerGroup from "../Handler/HandlerGroup";
import DecalMesh from "./DecalMesh";
import { button } from "leva";
import { useSelect } from "@react-three/drei";
import { useControlsDecals } from "@/components/edit/MultiLeva";

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

  const levaConfig = {
    position: {
      value: [center.x, center.y, center.z],
    },
    scale: {
      value: [0.2, 0.05],
    },
    size: {
      value: 16,
    },
    color: {
      value: "#000000",
    },
    "font family": {
      value: "San Serif",
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
    ["scale", "rotation"] // Hide scale and rotation controls
  ) as [any, any, (props: any) => void];

  const isSelected = !!selectedUserDataStores.find((s) => s === store);

  const toggleEditing = async () => {
    console.log("toggleEditing", state.isMoving, state.isResizing, state.isRotating, isSelected);
    if (state.isMoving || state.isResizing || state.isRotating || !isSelected)
      return;
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsEditing(!isEditing);
  };

  const { state, bind, handlers } = useDecalDrag({
    id,
    center,
    boundingBox,
    initialRotation,
    isSelected,
    onDelete,
    materialProps,
    onUpdate: set,
    onPointerDown: toggleEditing,
    disableKeyboardDelete: true, // TextDecal handles its own keyboard events
  });

  const currentScale = materialProps.scale || [1, 0.5];

  useEffect(() => {
    if (state.isMoving) {
      setIsEditing(false);
    }
  }, [state.isMoving, isEditing]);

  // Override keyboard delete to not work while editing
  useEffect(() => {
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

  return (
    <>
      {/* Visual representation mesh */}
      {/* A interactable interface for the user, the decal itself is too rigid to control directly */}
      {isSelected && (
        <group {...bind()}>
          <DecalMesh
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            rotation={materialProps.rotation}
            scale={currentScale}
            isSelected={isSelected}
            isHovered={state.hovered}
            store={store}
            onPointerOver={handlers.handlePointerOver}
            onPointerOut={() => handlers.setHover(false)}
          />
        </group>
      )}

      {!isSelected && (
        <DecalMesh
          position={[
            materialProps.position[0],
            materialProps.position[1],
            materialProps.position[2],
          ]}
          rotation={materialProps.rotation}
          scale={currentScale}
          isSelected={isSelected}
          isHovered={state.hovered}
          store={store}
          onPointerOver={handlers.handlePointerOver}
          onPointerOut={() => handlers.setHover(false)}
        />
      )}

      {/* The actual editable text */}
      <TextBox
        position={[
          materialProps.position[0],
          materialProps.position[1],
          materialProps.position[2],
        ]}
        setIsEditing={setIsEditing}
        rotation={materialProps.rotation}
        scale={[currentScale[0], currentScale[1], 1]}
        initialText={text}
        color={materialProps.color}
        size={materialProps.size}
        fontFamily={materialProps["font family"]}
        isSelected={isSelected}
        isEditing={isEditing}
        meshRef={meshRef}
      />

      {/* Handler group for resize handles */}
      {isSelected && (
        <>
          <HandlerGroup
            scale={currentScale}
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            rotation={materialProps.rotation}
            onUpdate={handlers.handleUpdate}
            onHover={handlers.setHover}
            setIsResizing={handlers.setIsResizing}
            normal={normal}
          />
          <RotationHandler
            position={[
              materialProps.position[0],
              materialProps.position[1],
              materialProps.position[2],
            ]}
            scale={currentScale}
            rotation={materialProps.rotation}
            normal={normal}
            onUpdate={handlers.handleRotationUpdate}
            onHover={handlers.setHover}
            setIsRotating={handlers.setIsRotating}
          />
        </>
      )}
    </>
  );
};

export default TextDecal;
