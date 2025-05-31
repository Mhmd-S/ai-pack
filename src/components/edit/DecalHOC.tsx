// src/components/edit/DecalHOC.tsx
import * as THREE from 'three';
import { Decal, Text, useTexture } from '@react-three/drei';

// Interfaces for different decal types
interface BaseDecalProps {
	position?: THREE.Vector3;
	rotation?: THREE.Euler;
	scale?: THREE.Vector3;
}

interface ImageDecalProps extends BaseDecalProps {
	type: 'image';
	imageUrl: string;
}

interface TextDecalProps extends BaseDecalProps {
	type: 'text';
	text: string;
	font?: string;
	fontSize?: number;
	color?: string | THREE.Color;
	maxWidth?: number;
	lineHeight?: number;
	letterSpacing?: number;
	textAlign?: 'left' | 'right' | 'center' | 'justify';
	anchorX?: number | 'left' | 'center' | 'right';
	anchorY?:
		| number
		| 'top'
		| 'middle'
		| 'bottom'
		| 'top-baseline'
		| 'bottom-baseline'
		| 'center-baseline';
}

// Shape decal props can be extended based on specific shapes needed (e.g., circle, square)
// For now, we'll keep it simple
interface ShapeDecalProps extends BaseDecalProps {
	type: 'shape';
	shape: 'circle' | 'square'; // Example shapes
	color?: string | THREE.Color;
}

type DecalProps = ImageDecalProps | TextDecalProps | ShapeDecalProps;

interface DecalHOCProps {
	decal: DecalProps;
	debug?: boolean;
	polygonOffsetFactor?: number;
}

const DecalHOC = ({
	decal,
	debug,
	polygonOffsetFactor = -1,
}: DecalHOCProps) => {
	const {
		position = new THREE.Vector3(0, 0, 0.5),
		rotation = new THREE.Euler(0, 0, 0),
		scale = new THREE.Vector3(1, 1, 1),
	} = decal;

	if (decal.type === 'image') {
		const texture = useTexture(decal.imageUrl);
		return (
			<Decal
				position={position}
				rotation={rotation}
				scale={scale}
				map={texture}
				debug={debug}
				polygonOffsetFactor={polygonOffsetFactor}
			/>
		);
	}

	if (decal.type === 'text') {
		return (
			<Decal
				position={position}
				rotation={rotation}
				scale={scale}
				debug={debug}
				polygonOffsetFactor={polygonOffsetFactor}
			>
				{/* The Text component from drei will be rendered as a texture on the Decal */}
				<meshStandardMaterial
					transparent
					polygonOffset
					polygonOffsetFactor={-10}
				>
					<Text
						font={decal.font}
						fontSize={decal.fontSize || 0.1}
						color={decal.color || '#000000'}
						maxWidth={decal.maxWidth}
						lineHeight={decal.lineHeight}
						letterSpacing={decal.letterSpacing}
						textAlign={decal.textAlign}
						anchorX={decal.anchorX}
						anchorY={decal.anchorY}
					>
						{decal.text}
					</Text>
				</meshStandardMaterial>
			</Decal>
		);
	}

	if (decal.type === 'shape') {
		// For shapes, we might need a different approach, possibly rendering a shape to a canvas and using that as a texture
		// Or using a shader material. This is a simplified example.
		let shapeGeometry;
		if (decal.shape === 'circle') {
			shapeGeometry = new THREE.CircleGeometry(0.5, 32); // Radius 0.5
		} else if (decal.shape === 'square') {
			shapeGeometry = new THREE.PlaneGeometry(1, 1); // Width 1, Height 1
		} else {
			return null; // Or a default shape
		}

		return (
			<Decal
				position={position}
				rotation={rotation}
				scale={scale}
				debug={debug}
				polygonOffsetFactor={polygonOffsetFactor}
			>
				<meshStandardMaterial
					transparent
					polygonOffset
					polygonOffsetFactor={-10}
				>
					<primitive object={shapeGeometry} />
					{/*This is a placeholder, ideally we would render the shape geometry to a texture or use a specific material */}
					<meshBasicMaterial
						color={decal.color || '#000000'}
						transparent
						opacity={1}
					/>
				</meshStandardMaterial>
			</Decal>
		);
	}

	return null;
};

export default DecalHOC;
