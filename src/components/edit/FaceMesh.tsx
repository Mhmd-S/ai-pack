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
}

const FaceMesh = ({ geometry, material }: FaceMeshProps) => {
  const meshRef = useRef<THREE.Mesh>(null!); // Ref for this specific mesh instance
  const edgesRef = useRef<THREE.Mesh>(null!); // Ref for the Edges
  const [hovered, setHover] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const selectedUserDataStores = useSelect().map((sel) => sel.userData.store); // Renamed for clarity

  const defaultColor = { r: 255, g: 255, b: 255 };

  // Assuming 'store' is unique per FaceMesh instance or a group it belongs to
  const [store, materialProps] = useControlsFaceMesh(selectedUserDataStores, {
    color: { value: defaultColor },
    "Add Text": button((get) =>
      alert(`Number value is ${get("number").toFixed(2)}`)
    ),
    "Add Shape": button((get) =>
      alert(`Number value is ${get("number").toFixed(2)}`)
    ),
    "Add Image": button((get) =>
      alert(`Number value is ${get("number").toFixed(2)}`)
    ),
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
    setImages((prevImages) => [...prevImages, imageUrl]);
  }, []);

  useImageDrop({ meshRef, onImageDrop });

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
          <meshBasicMaterial
            transparent
            color="#333"
            depthTest={false}
          />
        </Edges>

        <meshStandardMaterial
          color={rgbToHex((materialProps as any)?.color || defaultColor)}
        />


        <TextDecal
          meshRef={meshRef}
          parentGeometry={geometry}
          text={"Hello"}
          rotation={details?.angleZX ?? 0}
          center={details?.faceCenter ?? new THREE.Vector3(0,0,0)}
        />

        {meshRef.current &&
          images.map((image, index) => (
            <ImageDecal
              meshRef={meshRef}
              url={image}
              parentGeometry={geometry}
              key={`${image}-${index}`} // More robust key
              rotation={details?.angleZX ?? 0}
            />
          ))}
      </mesh>
    </>
  );
};

export default FaceMesh;
