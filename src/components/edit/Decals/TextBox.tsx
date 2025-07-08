import { useRef, useState, useEffect } from "react";
import { Text, Input, Container, Root } from "@react-three/uikit";
import { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

interface TextBoxProps {
  position: ThreeElements["mesh"]["position"];
  rotation: [number, number, number];
  scale: [number, number, number];
  initialText?: string;
  color: string;
  size: number;
  bind: any;
  fontFamily: string;
  isSelected: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isHovered?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  store: any;
}

const TextBox = ({
  initialText = "Your text",
  position,
  rotation,
  scale,
  color,
  size,
  bind,
  fontFamily,
  isSelected,
  isEditing,
  setIsEditing,
  isHovered = false,
  onPointerOver,
  onPointerOut,
  store,
}: TextBoxProps) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<any>(null);

  // Handle clicks outside the text box to save
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isSelected) return;

      if (isEditing) {
        setIsEditing(false);
        e.stopPropagation();
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, isSelected, setIsEditing]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing || !isSelected) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        setIsEditing(false);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, isSelected, setIsEditing]);

  const handleInputChange = (value: string) => {
    setText(value);
  };

  const pixelSize = size * scale[1] * 20; // Convert to pixel size
  const rootWidth = scale[0] * 4; // Convert to uikit units (smaller)
  const rootHeight = scale[1] * 2; // Convert to uikit units (smaller)

  // Apply hover styling
  const displayColor = color; // Keep original color, no hover color change
  const borderColor = isHovered && !isEditing ? 'red' : color;
  const borderWidth = isHovered && !isEditing ? 2 : 0;

  return (
    <group
      position={position}
      rotation={new THREE.Euler(rotation[0], rotation[1], rotation[2])}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      userData={{ store, isDecal: true }}
    >
      <Root
        sizeX={rootWidth}
        sizeY={rootHeight}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Container
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
          borderColor={borderColor}
          borderWidth={borderWidth}
        >
          {isEditing && isSelected ? (
            <Input
              ref={inputRef}
              value={text}
              onValueChange={handleInputChange}
              multiline
              fontSize={pixelSize}
              color={displayColor}
              backgroundColor="transparent"
              borderColor={borderColor}
              borderWidth={borderWidth}
              backgroundOpacity={1}
              width="90%"
              height="90%"
              padding={4}
            />
          ) : (
            <Text
              fontSize={pixelSize}
              color={displayColor}
              textAlign="center"
              maxWidth="90%"
              opacity={1}
              userData={{ store, isDecal: true }}
            >
              {text}
            </Text>
          )}
        </Container>
      </Root>
    </group>
  );
};

export default TextBox;
