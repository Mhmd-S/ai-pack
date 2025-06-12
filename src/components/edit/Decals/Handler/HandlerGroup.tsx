import { useState } from 'react';
import * as THREE from 'three';
import Handler from './Handler';

interface HandlerConfig {
    id: string;
    normalizedPosition: [number, number];
    type: 'corner' | 'edge-x' | 'edge-y';
    cursor: string;
}

interface HandlerGroupProps {
    position: [number, number, number];
    scale: [number, number];
    onScaleChange: (newScale: [number, number]) => void;
    onHover: (hovered: boolean) => void;
}

const HandlerGroup = ({ position, scale, onScaleChange, onHover }: HandlerGroupProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [activeHandlerId, setActiveHandlerId] = useState<string | null>(null);
    const [initialScale, setInitialScale] = useState<[number, number]>([1, 1]);
    const [initialHandlePosition, setInitialHandlePosition] = useState<THREE.Vector3>(new THREE.Vector3());

    const handlers: HandlerConfig[] = [
        { id: 'top-left', normalizedPosition: [-0.5, 0.5], type: 'corner', cursor: 'nw-resize' },
        { id: 'top-right', normalizedPosition: [0.5, 0.5], type: 'corner', cursor: 'ne-resize' },
        { id: 'bottom-left', normalizedPosition: [-0.5, -0.5], type: 'corner', cursor: 'sw-resize' },
        { id: 'bottom-right', normalizedPosition: [0.5, -0.5], type: 'corner', cursor: 'se-resize' },
        { id: 'top', normalizedPosition: [0, 0.5], type: 'edge-y', cursor: 'n-resize' },
        { id: 'bottom', normalizedPosition: [0, -0.5], type: 'edge-y', cursor: 's-resize' },
        { id: 'left', normalizedPosition: [-0.5, 0], type: 'edge-x', cursor: 'w-resize' },
        { id: 'right', normalizedPosition: [0.5, 0], type: 'edge-x', cursor: 'e-resize' },
    ];

    const getHandlerPosition = (normalizedPos: [number, number]): [number, number, number] => [
        position[0] + scale[0] * normalizedPos[0],
        position[1] + scale[1] * normalizedPos[1],
        position[2] + 0.03,
    ];

    const handleDragStart = (handlerId: string) => {
        setIsDragging(true);
        setActiveHandlerId(handlerId);
        setInitialScale([...scale]);

        const handler = handlers.find((h) => h.id === handlerId);
        if (handler) {
            const handlerPosition = getHandlerPosition(handler.normalizedPosition);
            setInitialHandlePosition(new THREE.Vector3(...handlerPosition));
        }
    };

 // ...existing code...

const handleCornerDrag = (handlerId: string, deltaX: number, deltaY: number) => {
    // Calculate the diagonal movement magnitude
    // Use the larger of the two deltas to determine scale change
    const diagonalDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    
    let scaleMultiplier = 1;
    
    switch (handlerId) {
        case 'top-left':
            // Moving away from center = grow, toward center = shrink
            scaleMultiplier = (-deltaX + deltaY) > 0 ? 1 : -1;
            break;
        case 'top-right':
            // Moving away from center = grow, toward center = shrink  
            scaleMultiplier = (deltaX + deltaY) > 0 ? 1 : -1;
            break;
        case 'bottom-left':
            // Moving away from center = grow, toward center = shrink
            scaleMultiplier = (-deltaX - deltaY) > 0 ? 1 : -1;
            break;
        case 'bottom-right':
            // Moving away from center = grow, toward center = shrink
            scaleMultiplier = (deltaX - deltaY) > 0 ? 1 : -1;
            break;
    }
    
    // Apply the same scale change to both dimensions (maintaining aspect ratio)
    const scaleChange = diagonalDelta * scaleMultiplier * 0.5; // Reduced sensitivity
    
    const newScaleX = Math.max(0.1, initialScale[0] + scaleChange);
    const newScaleY = Math.max(0.1, initialScale[1] + scaleChange);
    
    console.log("DIAGONAL SCALING:", { handlerId, deltaX, deltaY, scaleChange, newScaleX, newScaleY });
    
    onScaleChange([newScaleX, newScaleY]);
};

// ...existing code...

    const handleEdgeDrag = (handlerId: string, deltaX: number, deltaY: number) => {
        let newScaleX = initialScale[0];
        let newScaleY = initialScale[1];

        switch (handlerId) {
            case 'left':
                newScaleX = Math.max(0.1, initialScale[0] - deltaX * 2);
                break;
            case 'right':
                newScaleX = Math.max(0.1, initialScale[0] + deltaX * 2);
                break;
            case 'top':
                newScaleY = Math.max(0.1, initialScale[1] + deltaY * 2);
                break;
            case 'bottom':
                newScaleY = Math.max(0.1, initialScale[1] - deltaY * 2);
                break;
        }

        onScaleChange([newScaleX, newScaleY]);
    };

    const handleDrag = (
        handlerId: string,
        localMatrix: THREE.Matrix4,
        deltaLocalMatrix: THREE.Matrix4,
        worldMatrix: THREE.Matrix4,
        deltaWorldMatrix: THREE.Matrix4,
    ) => {
        if (!isDragging || activeHandlerId !== handlerId) return;

        const currentPosition = new THREE.Vector3();
        worldMatrix.decompose(currentPosition, new THREE.Quaternion(), new THREE.Vector3());

        const deltaX = currentPosition.x - initialHandlePosition.x;
        const deltaY = currentPosition.y - initialHandlePosition.y;

        const handler = handlers.find((h) => h.id === handlerId);
        if (!handler) return;

        if (handler.type === 'corner') {
            handleCornerDrag(handlerId, deltaX, deltaY);
        } else {
            handleEdgeDrag(handlerId, deltaX, deltaY);
        }
    };

    const handleDragEnd = (handlerId: string) => {
        if (activeHandlerId === handlerId) {
            setIsDragging(false);
            setActiveHandlerId(null);
        }
    };

    return (
        <>
            {handlers.map((handler) => (
                <Handler
                    key={handler.id}
                    id={handler.id}
                    position={getHandlerPosition(handler.normalizedPosition)}
                    type={handler.type}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    onHover={onHover}
                />
            ))}
        </>
    );
};

export default HandlerGroup;