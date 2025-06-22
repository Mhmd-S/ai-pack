import { useRef, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { ThreeElements } from '@react-three/fiber';

interface EditableTextProps {
	position?: ThreeElements['mesh']['position'];
	initialText?: string;
}

const EditableText = ({
	position,
	initialText = 'Edit me',
}: EditableTextProps) => {
	const [text, setText] = useState(initialText);
	const [isEditing, setIsEditing] = useState(false);
	const htmlRef = useRef<HTMLDivElement>(null);

	// Handle clicks outside the text box to save
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
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
	}, [isEditing]);

	return (
		<mesh position={position}>
			{/* Visual representation (e.g., plane) */}
			<planeGeometry args={[1, 1]} />
			<meshBasicMaterial transparent opacity={0} />

			<Html
				transform // Positions relative to parent mesh
				center // Centers the div on the mesh
				distanceFactor={0.5} // Scale text size
				style={{ pointerEvents: 'auto' }}
			>
				<div
					ref={htmlRef}
					contentEditable={isEditing}
					suppressContentEditableWarning
					onDoubleClick={(e) => {
						e.stopPropagation();
						setIsEditing(true);
					}}
					onBlur={() => setIsEditing(false)}
					onInput={(e) => setText(e.currentTarget.textContent || '')}
					style={{
						background: 'transparent',
						padding: '16px',
						borderRadius: '8px',
						border: '2px solid #0077ff',
						fontSize: '24px',
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						textAlign: 'center',
						color: 'black',
						cursor: 'text',
						userSelect: 'text',
						boxSizing: 'border-box',
					}}
				>
					{text}
				</div>
			</Html>
		</mesh>
	);
};

export default EditableText;
