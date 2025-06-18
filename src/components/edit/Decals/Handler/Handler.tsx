import React from 'react';
import { DragControls } from '@react-three/drei';
import * as THREE from 'three';

interface HandlerProps {
	id: string;
	position: [number, number, number];
	type: 'corner' | 'edge-x' | 'edge-y';
	onDragStart: (handlerId: string) => void;
	onDrag: (
		handlerId: string,
		localMatrix: THREE.Matrix4,
		deltaLocalMatrix: THREE.Matrix4,
		worldMatrix: THREE.Matrix4,
		deltaWorldMatrix: THREE.Matrix4
	) => void;
	onDragEnd: (handlerId: string) => void;
	onHover: (hovered: boolean) => void;
}

const Handler = ({
	id,
	position,
	type,
	onDragStart,
	onDrag,
	onDragEnd,
	onHover,
}: HandlerProps) => {
	const handleRef = React.useRef<THREE.Mesh>(null);
	// Different sizes and orientations for different handler types
	const getHandlerProps = () => {
		switch (type) {
			case 'corner':
				return {
					radius: 0.008,
					color: '#ff6600',
				};
			case 'edge-x':
				return {
					radius: 0.008,
					scaleY: 2, // Vertical orientation for X-axis handlers
					color: '#ff6600',
				};
			case 'edge-y':
				return {
					radius: 0.008,
					scaleX: 2, // Horizontal orientation for Y-axis handlers
					color: '#ff6600',
				};
			default:
				return {
					radius: 0.008,
					color: '#ff6600',
				};
		}
	};

	const { radius, scaleX = 1, scaleY = 1, color } = getHandlerProps();

	const handleDragStart = () => {
		onDragStart(id);
	};

	const handleDrag = (
		localMatrix: THREE.Matrix4,
		deltaLocalMatrix: THREE.Matrix4,
		worldMatrix: THREE.Matrix4,
		deltaWorldMatrix: THREE.Matrix4
	) => {
		onDrag(
			id,
			localMatrix,
			deltaLocalMatrix,
			worldMatrix,
			deltaWorldMatrix
		);
	};

	const handleDragEnd = () => {
		onDragEnd(id);
	};

	return (
		<>
			{' '}
			<DragControls
				onDragStart={handleDragStart}
				onDrag={handleDrag}
				onDragEnd={handleDragEnd}
			>
				<mesh
					ref={handleRef}
					position={position}
					scale={[scaleX, scaleY, 1]}
					onPointerOver={(e) => {
						e.stopPropagation();
						onHover(true);
					}}
					onPointerOut={() => onHover(false)}
				>
					{['edge-x', 'edge-y'].includes(type) ? (
						<circleGeometry args={[radius * 1, 16]} />
					) : (
						<capsuleGeometry args={[0.008, 0.012, 32, 64]} />
					)}
					<meshBasicMaterial
						transparent
						opacity={0}
						visible={false}
					/>
				</mesh>
			</DragControls>
			<mesh position={position} scale={[scaleX, scaleY, 1]}>
				{['edge-x', 'edge-y'].includes(type) ? (
					<circleGeometry args={[radius * 1, 16]} />
				) : (
					<capsuleGeometry args={[0.008, 0.008, 32, 64]} />
				)}
				<meshBasicMaterial color={color} />
			</mesh>
		</>
	);
};

export default Handler;
