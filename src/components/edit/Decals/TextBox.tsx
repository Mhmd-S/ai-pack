import { useRef, useState, useEffect, useMemo } from 'react';
import { Html, Decal } from '@react-three/drei';
import { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

interface EditableTextProps {
	meshRef: React.RefObject<THREE.Mesh>;
	position: ThreeElements['mesh']['position'];
	rotation: [number, number, number];
	scale: number;
	initialText?: string;
	color: string;
	size: number;
	fontFamily: string;
	isSelected: boolean;
	isEditing: boolean;
	setIsEditing: (isEditing: boolean) => void;
}

const EditableText = ({
	meshRef,
	initialText = 'Your text',
	position,
	rotation,
	scale,
	color,
	size,
	fontFamily,
	isSelected,
	isEditing,
	setIsEditing,
}: EditableTextProps) => {
	const [text, setText] = useState(initialText);
	const htmlRef = useRef<HTMLDivElement>(null);

	// Handle clicks outside the text box to save
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (!isSelected) return;

			if (
				htmlRef.current &&
				!htmlRef.current.contains(e.target as Node)
			) {
				setIsEditing(false);
			}
		};
		if (isEditing) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isEditing, isSelected]);

	const canvasTexture = useMemo(() => {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		const resolution = 256;
		canvas.width = resolution;
		canvas.height = resolution;

		if (context) {
			const font = `bold ${resolution / 5}px ${fontFamily}`;
			context.font = font;
			context.fillStyle = color;
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillText(text, resolution / 2, resolution / 2);
		}

		return new THREE.CanvasTexture(canvas);
	}, [text, color, fontFamily]);

	return (
		<>
			{isEditing ? (
				<Html
					position={position}
					rotation={
						new THREE.Euler(rotation[0], rotation[1], rotation[2])
					}
					scale={scale}
					transform // Positions relative to parent mesh
					center // Centers the div on the mesh
					style={{ pointerEvents: isSelected ? 'auto' : 'none' }}
					occlude={!isSelected && true}
				>
					<div
						ref={htmlRef}
						contentEditable={isEditing}
						suppressContentEditableWarning
						onBlur={() => setIsEditing(false)}
						onInput={(e) =>
							setText(e.currentTarget.textContent || '')
						}
						style={{
							background: 'transparent',
							padding: '2px',
							fontSize: size + 'px',
							width: '100%',
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							textAlign: 'center',
							color: color,
							cursor: 'text',
							userSelect: 'text',
							boxSizing: 'border-box',
							fontFamily: fontFamily,
						}}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: We need to set the initial text
						dangerouslySetInnerHTML={{ __html: text }}
					/>
				</Html>
			) : (
				<Decal
					mesh={meshRef}
					position={position as THREE.Vector3}
					rotation={
						new THREE.Euler(rotation[0], rotation[1], rotation[2])
					}
					scale={scale}
					onClick={(e) => {
						if (!isSelected) return;
						e.stopPropagation();
						setIsEditing(true);
					}}
				>
					<meshBasicMaterial
						map={canvasTexture}
						polygonOffset
						polygonOffsetFactor={-1} // Prevents z-fighting
						transparent
					/>
				</Decal>
			)}
		</>
	);
};

export default EditableText;
