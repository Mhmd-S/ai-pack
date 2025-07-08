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
  const clickedInsideRef = useRef(false);

  // Handle clicks outside the text box to save
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isSelected) return;

      if (isEditing) {
        // Only trigger outside click if we didn't click inside the textbox
        if (!clickedInsideRef.current) {
          console.log("clicked outside");
          setIsEditing(false);
        }
        // Reset the flag
        clickedInsideRef.current = false;
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

  const pixelSize = size * scale[1] * 5; // Convert to pixel size
  const rootWidth = scale[0]; // Convert to uikit units (smaller)
  const rootHeight = scale[1] * 2; // Convert to uikit units (smaller)

  // Apply hover styling
  const displayColor = color; // Keep original color, no hover color change
  const borderColor = (isHovered || isSelected) && !isEditing ? "red" : color;
  const borderWidth = (isHovered || isSelected) && !isEditing ? 0.1 : 0;

  return (
    <>
      {isSelected && !isEditing && (
        <group
          {...bind()}
          position={position}
          rotation={new THREE.Euler(rotation[0], rotation[1], rotation[2])}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          userData={{ store, isDecal: true }}
        >
          <Root
            {...bind()}
            sizeX={rootWidth}
            sizeY={rootHeight}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Container
              width="100%"
              height="auto"
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
                  borderColor="red"
                  borderWidth={0.1}
                  backgroundOpacity={1}
                  width="100%"
                  height="100%"
                />
              ) : (
                <Text
                  fontSize={pixelSize}
                  color={displayColor}
                  textAlign="center"
                  width="100%"
                  height="100%"
                  opacity={1}
                  userData={{ store, isDecal: true }}
                >
                  {text}
                </Text>
              )}
            </Container>
          </Root>
        </group>
      )}
      {isSelected && isEditing && (
        <group
          onClick={(e) => {
            clickedInsideRef.current = true;
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            clickedInsideRef.current = true;
            e.stopPropagation();
          }}
          onPointerUp={(e) => {
            clickedInsideRef.current = true;
            e.stopPropagation();
          }}
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
              height="auto"
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
                  borderColor="red"
                  borderWidth={0.1}
                  backgroundOpacity={1}
                  width="100%"
                  height="100%"
                />
              ) : (
                <Text
                  fontSize={pixelSize}
                  color={displayColor}
                  textAlign="center"
                  width="100%"
                  height="100%"
                  opacity={1}
                  userData={{ store, isDecal: true }}
                >
                  {text}
                </Text>
              )}
            </Container>
          </Root>
        </group>
      )}
      {!isSelected && (
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
              height="auto"
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
                  borderColor="red"
                  borderWidth={2}
                  backgroundOpacity={1}
                  width="100%"
                  height="100%"
                />
              ) : (
                <Text
                  fontSize={pixelSize}
                  color={displayColor}
                  textAlign="center"
                  width="100%"
                  height="100%"
                  opacity={1}
                  userData={{ store, isDecal: true }}
                >
                  {text}
                </Text>
              )}
            </Container>
          </Root>
        </group>
      )}
    </>
  );
};

export default TextBox;
