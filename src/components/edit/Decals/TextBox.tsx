import { useRef, useState, useEffect, useMemo } from "react";
import {
  Text,
  Input,
  Container,
  Root,
  FontFamilyProvider,
} from "@react-three/uikit";
import { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useFonts } from "@/hooks/use-fonts";

interface TextBoxProps {
  position: ThreeElements["mesh"]["position"];
  rotation: [number, number, number];
  scale: [number, number, number];
  initialText?: string;
  color: string;
  size: number;
  bind: any;
  fontFamily: string;
  alignText: string;
  isSelected: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isHovered?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  store: any;
  set: (props: { scale?: [number, number]; size?: number }) => void;
  isResizing?: boolean;
  resizeType?: "corner" | "edge-x" | "edge-y" | null;
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
  alignText,
  isSelected,
  isEditing,
  isHovered = false,
  setIsEditing,
  set,
  onPointerOver,
  onPointerOut,
  store,
  isResizing = false,
  resizeType = null,
}: TextBoxProps) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<any>(null);
  const textRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const clickedInsideRef = useRef(false);
  const rootRef = useRef<any>(null);

  const { fontProps } = useFonts();

  // Split combined font key into family and weight
  const parseFontKey = (fontKey: string) => {
    const parts = fontKey.split("-");
    if (parts.length >= 2) {
      const weight = parts[parts.length - 1];
      const family = parts.slice(0, -1).join("-");

      // Validate that this is a valid weight
      if (["light", "normal", "bold"].includes(weight)) {
        return { family, weight };
      }
    }

    // Fallback if parsing fails
    return { family: "inconsolata", weight: "normal" };
  };

  const { family: fontFamilyName, weight: fontWeight } =
    parseFontKey(fontFamily);

  // Check if the font family exists in fontProps
  const fontExists =
    fontProps[fontFamilyName] && fontProps[fontFamilyName][fontWeight];

  if (!fontExists) {
    console.warn(`Font ${fontFamilyName} with weight ${fontWeight} not found`);
  }

  // Use fallback font family and weight if the requested one doesn't exist
  const finalFontFamily = fontExists ? fontFamilyName : "inconsolata";
  const finalFontWeight = fontExists ? fontWeight : "normal";

  // Console log the interactionPanel when textRef changes
  useEffect(() => {
    if (textRef.current && textRef.current.interactionPanel) {
      // Add userData to the interactionPanel
      textRef.current.interactionPanel.userData = { store, isDecal: true };
    }
  }, [isEditing]);

  useEffect(() => {
    if (inputRef?.current && inputRef?.current?.setStyle) {
      inputRef.current.setStyle({
        wordBreak: "break-all",
        wordWrap: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "normal",
        hyphens: "none",
        lineBreak: "anywhere",
        textAlign: alignText as "left" | "center" | "right",
      });
    }
  }, [isEditing, alignText]);

  // useEffect for font Size -> Scale. When the size changes, we need to update the scale
  useEffect(() => {
    if (!isSelected || isEditing || resizeType === "edge-x" || resizeType === "corner") return;

    const scalePanel = containerRef.current?.interactionPanel?.scale;

    // Calculate aspect ratio from initial scale values
    const aspectRatio = scale[0] / scale[1];

    // Use y as the primary dimension and calculate x proportionally
    const newScaleY = scalePanel.y;
    const newScaleX = isResizing ? newScaleY * aspectRatio : scale[0];

    const rawScale: [number, number] = [newScaleX, newScaleY];

    // Only update if the filtered scale is different from current scale
    if (rawScale[0] !== scale[0] || rawScale[1] !== scale[1]) {
      set({
        scale: rawScale,
      });
    }
  }, [size]);

  // useEffect for scale x, this mainly handles the edge-x resizing by copying the scale x to the scale prop while not mainting aspect ratio, aslo handles when the text is wrapping and we got to update the y
  useEffect(() => {
    if (!isSelected || isEditing || resizeType === "corner") return;

    const scalePanel = containerRef.current?.interactionPanel?.scale;

    // Use y as the primary dimension and calculate x proportionally
    const newScaleY = scalePanel.y;
    const newScaleX = scalePanel.x;

    const rawScale: [number, number] = [newScaleX, newScaleY];
    // const filteredScale = applyNoiseFilter(rawScale, scale);

    // Only update if the filtered scale is different from current scale
    if (rawScale[0] !== scale[0] || rawScale[1] !== scale[1]) {
      set({
        scale: rawScale,
      });
    }
  }, [containerRef.current?.interactionPanel?.scale.x]);

  // Handle clicks outside the text box to save
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isSelected) return;

      if (isEditing) {
        // Only trigger outside click if we didn't click inside the textbox
        if (!clickedInsideRef.current) {
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
      if (!isEditing || !isSelected) {
        if (text.trim().length === 0) {
          setText(initialText);
        }
      }

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

  // Helper functions to determine props based on state
  const getGroupProps = () => {
    const baseProps = {
      position,
      rotation: new THREE.Euler(rotation[0], rotation[1], rotation[2]),
      onPointerOver,
      onPointerOut,
      userData: { store, isDecal: true },
    };

    if (isSelected && !isEditing) {
      return { ...baseProps, ...bind() };
    }

    if (isSelected && isEditing) {
      return {
        ...baseProps,
        onClick: (e: any) => {
          clickedInsideRef.current = true;
          e.stopPropagation();
        },
        onPointerDown: (e: any) => {
          clickedInsideRef.current = true;
          e.stopPropagation();
        },
        onPointerUp: (e: any) => {
          clickedInsideRef.current = true;
          e.stopPropagation();
        },
      };
    }

    return baseProps;
  };

  const getRootProps = () => {
    const rootWidth = scale[0];

    return {
      pixelSize: 0.002,
      sizeX: rootWidth,
      // sizeY: rootHeight,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "flex-start" as const,
      ...(isSelected && !isEditing ? bind() : {}),
    };
  };

  const getContainerProps = () => {
    const borderColor = isHovered || isSelected ? "red" : color;
    const borderWidth = isSelected ? 0.4 : 0;

    return {
      ref: containerRef,
      width: "100%" as const,
      height: "auto" as const,
      minWidth: 1,
      minHeight: 1,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "flex-start" as const,
      borderColor,
      borderWidth,
    };
  };

  const getInputProps = () => {
    const pixelSize = size;
    const displayColor = color;

    // Different caret widths based on state
    const caretWidth = isSelected && isEditing ? 0.5 : 0.01;

    return {
      ref: inputRef,
      value: text,
      onValueChange: handleInputChange,
      multiline: true,
      fontSize: pixelSize,
      color: displayColor,
      fontFamily: finalFontFamily,
      fontWeight: finalFontWeight as any,
      lineHeight: pixelSize,
      caretWidth,
      backgroundOpacity: 0,
      width: "100%" as const,
      height: "auto" as const,
    };
  };

  const getTextProps = () => {
    const pixelSize = size;
    const displayColor = color;

    // Use alignText for selected non-editing, center for others
    const textAlign = alignText as "left" | "center" | "right";

    return {
      ref: textRef,
      fontSize: pixelSize,
      color: displayColor,
      fontFamily: finalFontFamily,
      fontWeight: finalFontWeight as any,
      textAlign,
      wordBreak: "break-all" as const,
      width: "100%" as const,
      height: "auto" as const,
      opacity: 1,
    };
  };

  const groupProps = getGroupProps();
  const rootProps = getRootProps();
  const containerProps = getContainerProps();

  return (
    <group {...groupProps}>
      <Root ref={rootRef} {...rootProps}>
        <Container {...containerProps}>
          <FontFamilyProvider {...fontProps}>
            {isEditing && isSelected ? (
              <Input {...getInputProps()} />
            ) : (
              <Text {...getTextProps()}>{text}</Text>
            )}
          </FontFamilyProvider>
        </Container>
      </Root>
    </group>
  );
};

export default TextBox;
