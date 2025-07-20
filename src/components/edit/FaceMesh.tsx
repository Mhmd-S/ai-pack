import { useState, useRef, useCallback, useMemo } from "react";
import { useSelect, Edges, useCursor } from "@react-three/drei";
import { useControlsFaceMesh } from "@/components/edit/MultiLeva";
import { button } from "leva";
import * as THREE from "three";
import { rgbToHex } from "@/lib/utils";
import ImageDecal from "./Decals/ImageDecal";
import TextDecal from "./Decals/TextDecal";
import { calculateFaceDetails } from "@/lib/three/calculate-face-details";
import { useImageDrop } from "@/hooks/use-image-drop";

interface FaceMeshProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  text: string;
}

const FaceMesh = ({ geometry }: FaceMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null!); // Ref for this specific mesh instance
  const edgesRef = useRef<THREE.Mesh>(null!); // Ref for the Edges
  const [hovered, setHover] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

  const selectedUserDataStores = useSelect().map((sel) => sel.userData.store); // Renamed for clarity

  const defaultColor = { r: 255, g: 255, b: 255 };

  // Assuming 'store' is unique per FaceMesh instance or a group it belongs to
  const [store, materialProps] = useControlsFaceMesh(selectedUserDataStores, {
    color: { value: defaultColor },
    "Add Text": button((get) => addText(get("text"))),
    "Add Image": button(() => addImage()),
  });

  const isSelected = !!selectedUserDataStores.find((s) => s === store);
  useCursor(hovered);

  // Calculate face details when the mesh is selected
  const details = useMemo(
    () => (meshRef.current ? calculateFaceDetails(meshRef.current) : null),
    [meshRef.current]
  );

  // Handle image drop
  const onImageDrop = useCallback((imageUrl: string) => {
    setImages((prevImages) => ({
      ...prevImages,
      [Object.keys(prevImages).length]: imageUrl,
    }));
  }, []);

  // Handle text add
  const addText = useCallback((text: string) => {
    setTexts((prevTexts) => ({
      ...prevTexts,
      [Object.keys(prevTexts).length]: text,
    }));
  }, []);

  // Handle image add
  const addImage = useCallback(() => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    // Handle file selection
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create a URL for the selected image
        const imageUrl = URL.createObjectURL(file);
        
        // Add the image using the existing onImageDrop logic
        onImageDrop(imageUrl);
      }
    };
    
    // Trigger the file picker
    input.click();
  }, [onImageDrop]);

  // Handle image drop
  useImageDrop({ meshRef, onImageDrop });

  // Handle text remove
  const removeText = useCallback((text: string) => {
    setTexts((prevTexts) => {
      const { [text]: _, ...rest } = prevTexts;
      return rest;
    });
  }, []);

  // Handle image remove
  const removeImage = useCallback((image: string) => {
    setImages((prevImages) => {
      const { [image]: _, ...rest } = prevImages;
      return rest;
    });
  }, []);

  return (
    <>
      <mesh
        ref={meshRef} // Assign the ref to the mesh
        geometry={geometry}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={() => setHover(false)}
        userData={{ store }}
      >
        <Edges
          ref={edgesRef as any}
          visible={isSelected}
          lineWidth={5}
          color="#ff6600"
          scale={1}
          renderOrder={1000}
        >
          <meshBasicMaterial transparent color="#333" depthTest={false} />
        </Edges>

        <meshStandardMaterial
          side={THREE.DoubleSide}
          color={rgbToHex((materialProps as any)?.color || defaultColor)}
        />

        {meshRef.current &&
          Object.entries(texts).map(([id, text]) => (
            <TextDecal
              key={`${text}-${id}`}
              id={id}
              text={text}
              initialRotation={
                details?.rotation ?? ([0, 0, 0] as [number, number, number])
              }
              center={details?.faceCenter ?? new THREE.Vector3(0, 0, 0)}
              boundingBox={details?.boundingBox ?? new THREE.Box3()}
              normal={details?.faceNormal ?? new THREE.Vector3(0, 0, 0)}
              onDelete={removeText}
            />
          ))}

        {meshRef.current &&
          Object.entries(images).map(([id, image]) => (
            <ImageDecal
              key={`${image}-${id}`}
              id={id}
              url={image}
              initialRotation={
                details?.rotation ?? ([0, 0, 0] as [number, number, number])
              }
              center={details?.faceCenter ?? new THREE.Vector3(0, 0, 0)}
              boundingBox={details?.boundingBox ?? new THREE.Box3()}
              normal={details?.faceNormal ?? new THREE.Vector3(0, 0, 0)}
              onDelete={removeImage}
            />
          ))}
      </mesh>
    </>
  );
};

export default FaceMesh;
