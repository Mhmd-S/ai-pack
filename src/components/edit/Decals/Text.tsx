import { useDecalDrag } from "@/hooks/useDecalDrag";
import RotationHandler from "../Handler/RotationHandler";

import TextBox from "@/components/edit/Decals/TextBox";
import * as THREE from "three";
import { useState, useEffect, useMemo, useRef } from "react";
import TextHandlerGroup from "../Handler/TextHandlerGroup";
import { button } from "leva";
import { useSelect } from "@react-three/drei";
import { useControlsDecals } from "@/components/edit/MultiLeva";
import { useFonts, WEIGHTS } from "@/hooks/use-fonts";
import { Container } from "@react-three/uikit";

interface TextDecalProps {
  id: string;
  text: string;
  initialRotation: [number, number, number];
  center: THREE.Vector3;
  boundingBox: THREE.Box3;
  normal: THREE.Vector3;
  onDelete: (id: string) => void;
}

const TextDecal = ({
  id,
  text,
  initialRotation,
  center,
  boundingBox,
  normal,
  onDelete,
}: TextDecalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHover] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<
    "corner" | "edge-x" | "edge-y" | null
  >(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFontFamily, setCurrentFontFamily] = useState("inter");
  const [availableWeights, setAvailableWeights] = useState<
    Record<string, string>
  >({});

  const { getAvailableFamilies } = useFonts();

  const hoverRef = useRef(false);
  const textContainerRef = useRef<any>(null);

  // Create font options for Leva - convert kebab-case to title case for display
  const fontOptions = getAvailableFamilies().reduce(
    (acc, fontFamily) => {
      const displayName = fontFamily
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      acc[displayName] = fontFamily;
      return acc;
    },
    {} as Record<string, string>
  );

  // Function to get available weights for a font family
  const getAvailableWeights = (fontFamily: string): Record<string, string> => {
    // All fonts have the same weights based on the WEIGHTS constant
    return WEIGHTS.reduce(
      (acc, weight) => {
        const displayName = weight.charAt(0).toUpperCase() + weight.slice(1);
        acc[displayName] = weight;
        return acc;
      },
      {} as Record<string, string>
    );
  };

  // Initialize available weights on mount
  useEffect(() => {
    setAvailableWeights(getAvailableWeights(currentFontFamily));
  }, [currentFontFamily]);

  const levaConfig = {
    position: {
      value: [center.x, center.y, center.z],
    },
    scale: {
      value: [0.2, 0.04],
    },
    size: {
      value: 16,
    },
    color: {
      value: "#000000",
    },
    "font family": {
      value: "inter",
      options: fontOptions,
      onChange: (value: string) => {
        setCurrentFontFamily(value);
        setAvailableWeights(getAvailableWeights(value));
      },
    },
    "font weight": {
      value: "normal",
      options: availableWeights,
      onChange: (value: string) => {
        // Handle font weight change if needed
        // console.log('Font weight changed to:', value);
      },
    },
    "Align Text": {
      value: "center",
      options: ["left", "center", "right"],
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
    levaConfig,
  ) as [any, any, (props: any) => void];

  const isSelected = !!selectedUserDataStores.find((s) => s === store);

  // Determine the dominant plane of the face (mirror Image.tsx logic)
  const { horizontalAxis, verticalAxis, xMultiplier, yMultiplier } =
    useMemo(() => {
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      if (size.z < size.x && size.z < size.y) {
        return {
          horizontalAxis: 0,
          verticalAxis: 1,
          xMultiplier: Math.cos(initialRotation[1]) > 0 ? 100 : -100,
          yMultiplier: Math.cos(initialRotation[2]) > 0 ? -100 : 100,
        } as const; // X, Y
      }

      if (size.y < size.x && size.y < size.z) {
        return {
          horizontalAxis: 0,
          verticalAxis: 2,
          xMultiplier: Math.cos(initialRotation[0]) > 0 ? 100 : -100,
          yMultiplier: Math.cos(initialRotation[1]) > 0 ? 100 : -100,
        } as const; // X, Z
      }

      return {
        horizontalAxis: 2,
        verticalAxis: 1,
        xMultiplier:
          Math.cos(initialRotation[1]) * Math.sign(initialRotation[1]) * -1 > 0
            ? 100
            : -100,
        yMultiplier: Math.cos(initialRotation[2]) > 0 ? -100 : 100,
      } as const; // Z, Y
    }, []);

  const toggleEditing = async () => {
    if (isResizing || isRotating || !isSelected) return;

    await new Promise((resolve) => setTimeout(resolve, 150));
    setIsEditing(!isEditing);
  };

  const { bind } = useDecalDrag({
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

  // Handler for TextHandlerGroup that supports font size changes
  const handleTextUpdate = (newProps: {
    scale?: [number, number];
    position?: [number, number, number];
    size?: number;
  }) => {
    set(newProps);
  };

  // Custom setIsResizing function that also handles resize type
  const setIsResizingWithType = (
    resizing: boolean,
    type: "corner" | "edge-x" | "edge-y" | null = null
  ) => {
    setIsResizing(resizing);
    setResizeType(resizing ? type : null);
  };

  useEffect(() => {
    if (isMoving) {
      setIsEditing(false);
    }
  }, [isMoving, isEditing]);

  // Mirror Image.tsx: attach userData to the container interaction panel for selection
  useEffect(() => {
    if (textContainerRef.current) {
      textContainerRef.current.interactionPanel.userData = {
        store,
        isDecal: true,
      };
    }
  }, [textContainerRef.current, store]);

  // Override keyboard delete to not work while editing
  useEffect(() => {
    if (!isSelected) setIsEditing(false);

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

  // Only bind drag handlers at the container level (mirror Image.tsx behavior)
  const bindProps = () => {
    if (isSelected) {
      return { ...bind() };
    }
    return {};
  };

  // Provide a no-op binder to TextBox to avoid duplicate bindings
  const noopBind = () => ({}) as any;

  return (
    <Container
      ref={textContainerRef}
      marginLeft={materialProps.position[horizontalAxis] * xMultiplier}
      marginTop={materialProps.position[verticalAxis] * yMultiplier}
      transformRotateZ={materialProps.rotation[2]*100}
      positionType="absolute"
      inset="50%"
      {...(bindProps() as any)}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        setHover(true);
        hoverRef.current = true;
      }}
      onPointerOut={() => {
        setHover(false);
        hoverRef.current = false;
      }}
    >
      <TextBox
        bind={noopBind}
        position={materialProps.position}
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
          hoverRef.current = true;
        }}
        onPointerOut={() => {
          setHover(false);
          hoverRef.current = false;
        }}
      />

      <TextHandlerGroup
        visibility={isSelected ? "visible" : "hidden"}
        scale={[materialProps.scale[0], materialProps.scale[1]]}
        position={materialProps.position}
        rotation={materialProps.rotation}
        onUpdate={handleTextUpdate}
        onHover={(hoverState) => {
          setHover(hoverState);
          hoverRef.current = hoverState;
        }}
        setIsResizing={setIsResizingWithType}
        normal={normal}
        currentSize={materialProps.size}
        store={store}
      />
      <RotationHandler
        visibility={isSelected ? "visible" : "hidden"}
        position={materialProps.position}
        scale={[materialProps.scale[0], materialProps.scale[1]]}
        rotation={materialProps.rotation}
        normal={normal}
        boundingBox={boundingBox}
        onUpdate={(rotation) => {
          set({ rotation: rotation as [number, number, number] });
        }}
        onHover={(hoverState) => {
          setHover(hoverState);
          hoverRef.current = hoverState;
        }}
        setIsRotating={setIsRotating}
      />
    </Container>
  );
};

export default TextDecal;
