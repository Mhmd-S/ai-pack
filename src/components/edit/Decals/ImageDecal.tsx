import {
    Decal,
    useTexture,
    useSelect,
    useCursor,
} from '@react-three/drei';
import * as THREE from 'three';
import { useState } from 'react';
import { useControlsDecals } from '../MultiLeva';
import HandlerGroup from './Handler/HandlerGroup';
import DecalMesh from './DecalMesh';

interface ImageDecalProps {
    url: string;
    parentGeometry: THREE.BufferGeometry;
    meshRef: React.RefObject<THREE.Mesh>;
}

const ImageDecal = ({ url, parentGeometry, meshRef }: ImageDecalProps) => {
    const [hovered, setHover] = useState(false);

    const texture = useTexture(url);
    const standardWidth = 0.5;
    const aspectRatio = texture.image
        ? texture.image.height / texture.image.width
        : 1;
    const standardHeight = standardWidth * aspectRatio;

    const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

    const [store, materialProps, set] = useControlsDecals(
        selectedUserDataStores,
        {
            position: {
                value: [
                    parentGeometry?.boundingSphere?.center?.x || 0,
                    parentGeometry?.boundingSphere?.center?.y || 0,
                    parentGeometry?.boundingSphere?.center?.z || 0,
                ],
            },
            scale: {
                value: [standardWidth, standardHeight],
            },
        }
    );

    useCursor(hovered);

    const isSelected = !!selectedUserDataStores.find((s) => s === store);
    const currentScale = materialProps.scale || [1, 1];

    const handleScaleChange = (newScale: [number, number]) => {
        set({ scale: newScale });
    };

    const handlePointerOver = (e: THREE.Event) => {
        e.stopPropagation();
        setHover(true);
    };

    return (
        <>
            {/* Visual representation mesh */}
            <DecalMesh
                position={materialProps.position as [number, number, number]}
                scale={currentScale}
                isSelected={isSelected}
                isHovered={hovered}
                store={store}
                onPointerOver={handlePointerOver}
                onPointerOut={() => setHover(false)}
            />

            {/* Handler group for resize handles */}
            {isSelected && (
                <HandlerGroup
                    position={materialProps.position as [number, number, number]}
                    scale={currentScale}
                    onScaleChange={handleScaleChange}
                    onHover={setHover}
                />
            )}

            {/* The actual decal */}
            <Decal
                mesh={meshRef}
                position={materialProps.position as [number, number, number]}
                scale={[currentScale[0], currentScale[1], currentScale[0]]}
                map={texture}
                rotation={new THREE.Euler(0, 0, 0)}
            />
        </>
    );
};

export default ImageDecal;