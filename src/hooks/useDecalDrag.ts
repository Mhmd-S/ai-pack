import { useState, useRef, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { useSelect, useCursor } from '@react-three/drei';
import { useControlsDecals } from '@/components/edit/MultiLeva';
import * as THREE from 'three';

interface UseDecalDragProps {
    id: string;
    center: THREE.Vector3;
    boundingBox: THREE.Box3;
    initialRotation: [number, number, number];
    onDelete: (id: string) => void;
    levaConfig: Record<string, any>;
    hiddenControls?: string[];
    disableKeyboardDelete?: boolean;
}

interface DecalState {
    hovered: boolean;
    isResizing: boolean;
    isRotating: boolean;
    isSelected: boolean;
}

export const useDecalDrag = ({
    id,
    center,
    boundingBox,
    initialRotation,
    onDelete,
    levaConfig,
    hiddenControls = [],
    disableKeyboardDelete = false
}: UseDecalDragProps) => {
    const [hovered, setHover] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const hasInitialized = useRef(false);

    // Get access to R3F's state, including camera and raycaster
    const { camera, raycaster } = useThree();

    const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

    const [store, materialProps, set] = useControlsDecals(
        selectedUserDataStores,
        levaConfig,
        hiddenControls
    ) as [any, any, (props: any) => void];

    const isSelected = !!selectedUserDataStores.find((s) => s === store);
    
    useCursor(hovered);

    // Reset initialization flag when key props change
    useEffect(() => {
        hasInitialized.current = false;
    }, [id]);

    // Position offset calculation - only run once per decal instance
    useEffect(() => {
        // Skip if already initialized
        if (hasInitialized.current) return;
        
        const offset = 0.02;
        let { x, y, z } = center;

        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);

        if (absX > absY && absX > absZ) {
            x += Math.sign(x) * offset;
        } else if (absY > absX && absY > absZ) {
            y += Math.sign(y) * offset;
        } else {
            z += Math.sign(z) * offset;
        }

        set({ rotation: [initialRotation[0], initialRotation[1], initialRotation[2]] });
        set({ position: [x, y, z] });
        hasInitialized.current = true;
    }, [center, initialRotation]); // Remove 'set' from dependencies to prevent re-runs

    // Refs to store drag-related 3D data
    const dragPlane = useRef(new THREE.Plane());
    const dragStartPoint = useRef(new THREE.Vector3());
    const dragOffset = useRef(new THREE.Vector3());

    const bind = useDrag(
        ({ event, down, first }) => {
            event.stopPropagation();
            
            if (!isSelected || isResizing || isRotating) return;
            
            // We are working with a non-HTML element, so we need to access the original event
            const e = event as unknown as ThreeEvent<PointerEvent>;

            // Only proceed if actively dragging (mouse/pointer is down)
            if (!down) return;

            if (first) {
                // On first drag event, calculate the drag plane

                // 1. Find intersection point on the DecalMesh
                const intersection = e.intersections[0];
                if (!intersection) return; // Should not happen if drag starts on the object
                dragStartPoint.current.copy(intersection.point);

                // 2. Create a plane at that point, oriented towards the camera
                dragPlane.current.setFromNormalAndCoplanarPoint(
                    camera.getWorldDirection(dragPlane.current.normal),
                    dragStartPoint.current
                );

                // 3. Calculate offset between current decal position and drag start point
                const currentPosition = new THREE.Vector3(
                    materialProps.position[0],
                    materialProps.position[1],
                    materialProps.position[2]
                );
                dragOffset.current.subVectors(currentPosition, dragStartPoint.current);

                // Don't update position on first event, just set up the plane
                return;
            }

            // On every subsequent drag event, raycast onto the plane
            const intersectionPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane.current, intersectionPoint);

            // Apply the offset to maintain relative position
            intersectionPoint.add(dragOffset.current);

            // Calculate half extents of the decal based on current scale
            const currentScale = materialProps.scale || [1, 1];
            const halfWidth = currentScale[0] / 2;
            const halfHeight = currentScale[1] / 2;

            // Clamp the position to stay within parent geometry bounds
            // considering the decal's dimensions
            const size = new THREE.Vector3();
            boundingBox.getSize(size);

            let newPosition: [number, number, number];

            // The smallest dimension of the bounding box tells us the plane's normal direction.
            if (size.z < size.x && size.z < size.y) {
                // XY plane is dominant (normal along Z)
                const clampedX = Math.max(
                    boundingBox.min.x + halfWidth,
                    Math.min(boundingBox.max.x - halfWidth, intersectionPoint.x)
                );
                const clampedY = Math.max(
                    boundingBox.min.y + halfHeight,
                    Math.min(boundingBox.max.y - halfHeight, intersectionPoint.y)
                );
                newPosition = [clampedX, clampedY, materialProps.position[2]];
            } else if (size.y < size.x && size.y < size.z) {
                // XZ plane is dominant (normal along Y)
                const clampedX = Math.max(
                    boundingBox.min.x + halfWidth,
                    Math.min(boundingBox.max.x - halfWidth, intersectionPoint.x)
                );
                const clampedZ = Math.max(
                    boundingBox.min.z + halfHeight,
                    Math.min(boundingBox.max.z - halfHeight, intersectionPoint.z)
                );
                newPosition = [clampedX, materialProps.position[1], clampedZ];
            } else {
                // YZ plane is dominant (normal along X)
                const clampedY = Math.max(
                    boundingBox.min.y + halfHeight,
                    Math.min(boundingBox.max.y - halfHeight, intersectionPoint.y)
                );
                const clampedZ = Math.max(
                    boundingBox.min.z + halfHeight,
                    Math.min(boundingBox.max.z - halfHeight, intersectionPoint.z)
                );
                newPosition = [materialProps.position[0], clampedY, clampedZ];
            }

            // Update state via Leva controls
            set({ position: newPosition });
            event.stopPropagation();
        },
        {
            // We need to use pointer events to get intersection data from R3F
            eventOptions: { pointer: true } as any,
        }
    );

    // Add keyboard event listener for delete key
    useEffect(() => {
        if (disableKeyboardDelete) return;
        
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isSelected && (event.key === 'Delete' || event.key === 'Backspace')) {
                event.preventDefault();
                onDelete(id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSelected, id, onDelete, disableKeyboardDelete]);

    const handlePointerOver = (e: any) => {
        e.stopPropagation();
        setHover(true);
    };

    const handleRotationUpdate = (newRotation: [number, number, number]) => {
        set({ rotation: newRotation });
    };

    const handleUpdate = (newProps: {
        scale: [number, number];
        position: [number, number, number];
    }) => {
        set({ scale: newProps.scale, position: newProps.position });
    };

    const state: DecalState = {
        hovered,
        isResizing,
        isRotating,
        isSelected
    };

    return {
        state,
        materialProps,
        store,
        set,
        bind,
        handlers: {
            setHover,
            setIsResizing,
            setIsRotating,
            handlePointerOver,
            handleRotationUpdate,
            handleUpdate
        }
    };
}; 