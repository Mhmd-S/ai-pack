import { useRef, useState, useEffect, useMemo } from 'react';
import { Html, Decal } from '@react-three/drei';
import { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

interface TextBoxProps {
	meshRef: React.RefObject<THREE.Mesh>;
	position: ThreeElements['mesh']['position'];
	rotation: [number, number, number];
	scale: [number, number, number];
	initialText?: string;
	color: string;
	size: number;
	fontFamily: string;
	isSelected: boolean;
	isEditing: boolean;
	setIsEditing: (isEditing: boolean) => void;
}

const wrapText = (
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	lineHeight: number
) => {
	const words = text.split(' ');
	let line = '';
	const lines = [];

	for (let n = 0; n < words.length; n++) {
		const testLine = line + words[n] + ' ';
		const metrics = context.measureText(testLine);
		const testWidth = metrics.width;
		if (testWidth > maxWidth && n > 0) {
			lines.push(line.trim());
			line = words[n] + ' ';
		} else {
			line = testLine;
		}
	}
	lines.push(line.trim());

	const totalHeight = lines.length * lineHeight;
	let currentY = y - totalHeight / 2;

	context.textBaseline = 'top'; // Set baseline to top for easier calculation
	for (let i = 0; i < lines.length; i++) {
		context.fillText(lines[i], x, currentY);
		currentY += lineHeight;
	}
};

const TextBox = ({
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
}: TextBoxProps) => {
	const [text, setText] = useState(initialText);
	const htmlRef = useRef<HTMLTextAreaElement>(null);

	// Handle clicks outside the text box to save
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (!isSelected) return;

			if (
				htmlRef.current &&
				!htmlRef.current.contains(e.target as Node)
			) {
				setIsEditing(false);
				e.stopPropagation();
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
		const resolution = 1024; // High res for crisp text
		// Aspect ratio from decal's scale to prevent stretching
		const aspectRatio = scale[1] > 0 ? scale[0] / scale[1] : 1;
		canvas.width = resolution;
		canvas.height = resolution / aspectRatio;

		if (context) {
			// Adjust font size based on the decal's height and base size.
			// This ensures that as the decal gets taller, the font size increases.
			const fontSizeOnCanvas = size * scale[1] * 120; // Multiplier adjusted for visual balance.

			const lineHeight = fontSizeOnCanvas * 1.2;
			const font = `bold ${fontSizeOnCanvas}px ${fontFamily}`;

			context.font = font;
			context.fillStyle = color;
			context.textAlign = 'center';
			context.clearRect(0, 0, canvas.width, canvas.height);
			wrapText(
				context,
				text,
				canvas.width / 2,
				canvas.height / 2,
				canvas.width * 0.9, // 90% width to leave some padding
				lineHeight
			);
		}

		return new THREE.CanvasTexture(canvas);
	}, [text, color, fontFamily, scale, size]);

	return (
		<>
			{isEditing && isSelected ? (
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
					<textarea
						ref={htmlRef}
						autoFocus
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
							textAlign: 'center',
							color: color,
							cursor: 'text',
							userSelect: 'text',
							boxSizing: 'border-box',
							fontFamily: fontFamily,
							wordWrap: 'break-word',
						}}
						value={text}
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

export default TextBox;
