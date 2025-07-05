import { useDecalDrag } from '@/hooks/useDecalDrag';
import RotationHandler from '../Handler/RotationHandler';

import TextBox from '@/components/edit/Decals/TextBox';
import * as THREE from 'three';
import { useState, useEffect } from 'react';
import HandlerGroup from '../Handler/HandlerGroup';
import DecalMesh from './DecalMesh';
import { button } from 'leva';

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
            value: '#000000',
        },
        'font family': {
            value: 'San Serif',
        },
        rotation: { value: initialRotation, render: () => false },
        delete: button((get) => {
            onDelete(id);
        }),
    };

    const {
        state,
        materialProps,
        store,
        bind,
        handlers
    } = useDecalDrag({
        id,
        center,
        boundingBox,
        initialRotation,
        onDelete,
        levaConfig,
        hiddenControls: ['scale', 'rotation'], // Hide scale and rotation controls
        disableKeyboardDelete: true // TextDecal handles its own keyboard events
    });

    const currentScale = materialProps.scale || [1, 0.5];

    const toggleEditing = () => {
        if (!state.isSelected) return;
        setIsEditing(!isEditing);
        
    };

    // Override keyboard delete to not work while editing
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isEditing && state.isSelected && (event.key === 'Delete' || event.key === 'Backspace')) {
                event.preventDefault();
                onDelete(id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [state.isSelected, id, onDelete, isEditing]);

    return (
        <>
            {/* Visual representation mesh */}
            {/* A interactable interface for the user, the decal itself is too rigid to control directly */}
            <group {...bind()}>
                <DecalMesh
                    position={[
                        materialProps.position[0],
                        materialProps.position[1],
                        materialProps.position[2],
                    ]}
                    rotation={materialProps.rotation}
                    scale={currentScale}
                    isSelected={state.isSelected}
                    isHovered={state.hovered}
                    store={store}
                    onPointerOver={handlers.handlePointerOver}
                    onPointerOut={() => handlers.setHover(false)}
                    onPointerDown={toggleEditing}
                />
            </group>

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
                fontFamily={materialProps['font family']}
                isSelected={state.isSelected}
                isEditing={isEditing}
                meshRef={meshRef}
            />

            {/* Handler group for resize handles */}
            {state.isSelected && (
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
