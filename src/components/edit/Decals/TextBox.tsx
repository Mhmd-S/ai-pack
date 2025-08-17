import { useRef, useState, useEffect, useMemo, ComponentRef } from "react";
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
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  const textRef = useRef<ComponentRef<typeof Text>>(null);
  const containerRef = useRef<ComponentRef<typeof Container>>(null);
  const clickedInsideRef = useRef(false);

  const { fontProps } = useFonts();

  // Memoized font parsing function
  const parseFontKey = useMemo(() => {
    return (fontKey: string) => {
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
      return { family: "poppins", weight: "normal" };
    };
  }, []);

  // Memoized font family and weight parsing
  const { fontFamilyName, fontWeight, finalFontFamily, finalFontWeight } =
    useMemo(() => {
      const { family: fontFamilyName, weight: fontWeight } =
        parseFontKey(fontFamily);

      // Check if the font family exists in fontProps
      const fontExists =
        fontProps[fontFamilyName] && fontProps[fontFamilyName][fontWeight];

      // Use fallback font family and weight if the requested one doesn't exist
      const finalFontFamily = fontExists ? fontFamilyName : "poppins";
      const finalFontWeight = fontExists ? fontWeight : "normal";

      // Map string weights to numeric values for the UI components
      const fontWeightMap: Record<string, number> = {
        light: 300,
        normal: 400,
        bold: 700,
      };

      return {
        fontFamilyName,
        fontWeight,
        fontExists,
        finalFontFamily,
        finalFontWeight: fontWeightMap[finalFontWeight] || 400,
      };
    }, [fontFamily, fontProps, parseFontKey]);

  useEffect(() => {
    if (!inputRef.current || !textRef.current) return;

    // Check if the font has the selected weight
    if (!fontProps[fontFamilyName][finalFontWeight]) {
      inputRef.current.setStyle({
        fontFamily: fontFamilyName,
        fontWeight: 400,
      });
      textRef.current.setStyle({
        fontFamily: fontFamilyName,
        fontWeight: 400,
      });
      return;
    }

    inputRef.current.setStyle({
      fontFamily: fontFamilyName,
      fontWeight: 400,
    });
    textRef.current.setStyle({
      fontFamily: fontFamilyName,
      fontWeight: 400,
    });
  }, [fontFamilyName, fontWeight]);

  // Register the textRef to the store
  useEffect(() => {
    if (textRef.current && textRef.current.interactionPanel) {
      // Add userData to the interactionPanel
      textRef.current.interactionPanel.userData = { store, isDecal: true };
    }
  }, [isEditing, fontFamilyName, fontWeight]);

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

  useEffect(() => {
    if (inputRef?.current && isEditing) {
      inputRef.current.focus();
    }
  }, [isEditing, inputRef.current]);

  // useEffect for font Size -> Scale. When the size changes, we need to update the scale
  useEffect(() => {
    if (
      !isSelected ||
      isEditing ||
      resizeType === "edge-x" ||
      resizeType === "corner"
    )
      return;

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
    if (!isSelected || resizeType === "corner") return;

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
  }, [
    containerRef.current?.interactionPanel?.scale.x,
    containerRef.current?.interactionPanel?.scale.y,
    inputRef.current?.interactionPanel?.scale.x,
    inputRef.current?.interactionPanel?.scale.y,
    fontFamilyName,
    finalFontWeight,
  ]);

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

  const getContainerProps = () => {
    const borderColor = isHovered || isSelected ? "red" : color;
    const borderWidth = isSelected ? 0.2 : 0;

    const baseProps = {
      ref: containerRef,
      width: scale[0] * 100,
      height: "auto" as const,
      flexDirection: "column" as const,
      alignItems: "center" as const,
      positionType: "absolute" as const,
      justifyContent: "flex-start" as const,
      transformTranslateX: "-50%",
      transformTranslateY: "-50%",
      borderColor,
      borderWidth,
      position,
      rotation: new THREE.Euler(rotation[0], rotation[1], rotation[2]),
      onPointerOver,
      onPointerOut,
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

  const getInputProps = () => {
    const displayColor = color;

    return {
      value: text,
      onValueChange: handleInputChange,
      multiline: true,
      fontSize: size / 0.002,
      color: displayColor,
      fontFamily: finalFontFamily,
      fontWeight: finalFontWeight,
      lineHeight: size * 1.2,
      caretWidth: 0.7,
      caretColor: "black",
      backgroundOpacity: 0,
      width: "100%" as const,
      height: "auto" as const,
    };
  };

  const getTextProps = () => {
    const pixelSize = size / 6;
    const displayColor = color;

    // Use alignText for selected non-editing, center for others
    const textAlign = alignText as "left" | "center" | "right";

    return {
      ref: textRef,
      fontSize: pixelSize,
      color: displayColor,
      fontFamily: finalFontFamily,
      fontWeight: finalFontWeight,
      textAlign,
      wordBreak: "break-all" as const,
      width: "100%" as const,
      height: "auto" as const,
      opacity: 1,
    };
  };

  const containerProps = getContainerProps();

  return (
    <Container {...containerProps}>
      <FontFamilyProvider {...fontProps}>
        {isEditing && isSelected ? (
          <Input ref={inputRef} {...getInputProps()} />
        ) : (
          <Text {...getTextProps()}>{text}</Text>
        )}
      </FontFamilyProvider>
    </Container>
  );
};

export default TextBox;
