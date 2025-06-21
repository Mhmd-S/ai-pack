import { useRef } from 'react';
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
	onUpdate: (newProps: {
		scale: [number, number];
		position: [number, number, number];
	}) => void;
	onHover: (hovered: boolean) => void;
	setIsResizing: (isResizing: boolean) => void;
}

const handlers: HandlerConfig[] = [
	{
		id: 'top-left',
		normalizedPosition: [-0.5, 0.5],
		type: 'corner',
		cursor: 'nwse-resize',
	},
	{
		id: 'top-right',
		normalizedPosition: [0.5, 0.5],
		type: 'corner',
		cursor: 'nesw-resize',
	},
	{
		id: 'bottom-left',
		normalizedPosition: [-0.5, -0.5],
		type: 'corner',
		cursor: 'nesw-resize',
	},
	{
		id: 'bottom-right',
		normalizedPosition: [0.5, -0.5],
		type: 'corner',
		cursor: 'nwse-resize',
	},
	{
		id: 'top',
		normalizedPosition: [0, 0.5],
		type: 'edge-y',
		cursor: 'ns-resize',
	},
	{
		id: 'bottom',
		normalizedPosition: [0, -0.5],
		type: 'edge-y',
		cursor: 'ns-resize',
	},
	{
		id: 'left',
		normalizedPosition: [-0.5, 0],
		type: 'edge-x',
		cursor: 'ew-resize',
	},
	{
		id: 'right',
		normalizedPosition: [0.5, 0],
		type: 'edge-x',
		cursor: 'ew-resize',
	},
];

/**
 * Renders resize handlers with "pivot-point" resizing.
 * This version has the corrected component hierarchy and data flow.
 */
const HandlerGroup = ({
	position,
	scale,
	onUpdate,
	onHover,
	setIsResizing,
}: HandlerGroupProps) => {
	const dragInfo = useRef({
		pivotPoint: new THREE.Vector3(),
		initialPosition: new THREE.Vector3(),
		initialScale: new THREE.Vector2(),
		initialHandlePosition: new THREE.Vector3(),
	}).current;

	const getPointInWorldSpace = (
		normalizedPos: [number, number],
		currentScale: [number, number],
		currentPosition: [number, number, number]
	): THREE.Vector3 =>
		new THREE.Vector3(
			currentPosition[0] + currentScale[0] * normalizedPos[0],
			currentPosition[1] + currentScale[1] * normalizedPos[1],
			currentPosition[2]
		);

	const handleDragStart = (handler: HandlerConfig) => {
		setIsResizing(true);
		const pivotNormalizedPos: [number, number] = [
			-handler.normalizedPosition[0],
			-handler.normalizedPosition[1],
		];

		dragInfo.initialPosition.set(...position);
		dragInfo.initialScale.set(...scale);
		dragInfo.pivotPoint = getPointInWorldSpace(
			pivotNormalizedPos,
			scale,
			position
		);
		dragInfo.initialHandlePosition = getPointInWorldSpace(
			handler.normalizedPosition,
			scale,
			position
		);
	};

	const handleDrag = (handler: HandlerConfig, movement: THREE.Vector2) => {
		const {
			pivotPoint,
			initialHandlePosition,
			initialScale,
			initialPosition,
		} = dragInfo;
		const currentHandlePosition = new THREE.Vector3()
			.copy(initialHandlePosition)
			.add({ ...movement, z: 0 });

		const newWidth = Math.abs(currentHandlePosition.x - pivotPoint.x);
		const newHeight = Math.abs(currentHandlePosition.y - pivotPoint.y);

		let newScale: [number, number];
		let newPosition: [number, number, number];

		if (handler.type === 'corner') {
			const aspectRatio = initialScale.x / initialScale.y;
			newScale =
				newWidth / aspectRatio > newHeight
					? [newWidth, newWidth / aspectRatio]
					: [newHeight * aspectRatio, newHeight];

			const newCenterX = (currentHandlePosition.x + pivotPoint.x) / 2;
			const newCenterY = (currentHandlePosition.y + pivotPoint.y) / 2;
			newPosition = [newCenterX, newCenterY, initialPosition.z];
		} else if (handler.type === 'edge-x') {
			newScale = [newWidth, initialScale.y];
			const newCenterX = (currentHandlePosition.x + pivotPoint.x) / 2;
			newPosition = [newCenterX, initialPosition.y, initialPosition.z];
		} else {
			// 'edge-y'
			newScale = [initialScale.x, newHeight];
			const newCenterY = (currentHandlePosition.y + pivotPoint.y) / 2;
			newPosition = [initialPosition.x, newCenterY, initialPosition.z];
		}

		onUpdate({
			scale: [Math.max(0.01, newScale[0]), Math.max(0.01, newScale[1])],
			position: newPosition,
		});
	};

	const handleDragEnd = () => {
		setIsResizing(false);
	};

	return (
		<group>
			{handlers.map((handler) => {
				// Determine visual scale for edge handlers to make them look like bars
				const visualScale: [number, number, number] = [1, 1, 1];
				if (handler.type === 'edge-x') visualScale[1] = 2.5;
				if (handler.type === 'edge-y') visualScale[0] = 2.5;

				return (
					<Handler
						key={handler.id}
						position={getPointInWorldSpace(
							handler.normalizedPosition,
							scale,
							position
						)}
						cursor={handler.cursor}
						scale={visualScale}
						onHover={onHover}
						onDragStart={() => handleDragStart(handler)}
						onDrag={(movement) => handleDrag(handler, movement)}
						onDragEnd={handleDragEnd}
					/>
				);
			})}
		</group>
	);
};

export default HandlerGroup;
