import React, { useState, useRef, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { X } from 'lucide-react';

interface TextElement {
	id: string;
	text: string;
	position: { x: number; y: number };
	size: { width: number; height: number };
	font: string;
	fontSize: number;
	color: string;
	faceName: string;
}

interface DraggableTextProps {
	text: TextElement;
	isSelected: boolean;
	onSelect: () => void;
	onUpdate: (updates: Partial<TextElement>) => void;
	onDelete: () => void;
	onDrop?: (faceName: string) => void;
}

const DraggableText: React.FC<DraggableTextProps> = ({
	text,
	isSelected,
	onSelect,
	onUpdate,
	onDelete,
	onDrop,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(text.text);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const textRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isEditing && textRef.current) {
			textRef.current.focus();
		}
	}, [isEditing]);

	const handleDragStart = (e: React.DragEvent) => {
		setIsDragging(true);
		e.dataTransfer.setData('text/plain', text.id);
		e.dataTransfer.effectAllowed = 'move';

		// Calculate the offset from the mouse position to the element's top-left corner
		const rect = (e.target as HTMLElement).getBoundingClientRect();
		setDragOffset({
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		});
	};

	const handleDragEnd = (e: React.DragEvent) => {
		setIsDragging(false);

		// Calculate new position based on the drop point and initial offset
		const newX = e.clientX - dragOffset.x;
		const newY = e.clientY - dragOffset.y;

		onUpdate({
			position: {
				x: newX,
				y: newY,
			},
		});
	};

	const handleDoubleClick = () => {
		setIsEditing(true);
		setEditText(text.text);
	};

	const handleBlur = () => {
		setIsEditing(false);
		if (editText !== text.text) {
			onUpdate({ text: editText });
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			setIsEditing(false);
			if (editText !== text.text) {
				onUpdate({ text: editText });
			}
		} else if (e.key === 'Escape') {
			setIsEditing(false);
			setEditText(text.text);
		}
	};

	return (
		<div
			style={{
				position: 'absolute',
				left: text.position.x,
				top: text.position.y,
				cursor: isDragging ? 'grabbing' : 'grab',
				zIndex: isSelected ? 1000 : 100,
				transform: isDragging ? 'scale(1.02)' : 'scale(1)',
				transition: 'transform 0.1s ease',
				userSelect: 'none',
				touchAction: 'none',
			}}
			draggable
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onClick={onSelect}
			onDoubleClick={handleDoubleClick}
		>
			<Resizable
				size={text.size}
				onResizeStop={(e, direction, ref, d) => {
					onUpdate({
						size: {
							width: text.size.width + d.width,
							height: text.size.height + d.height,
						},
					});
				}}
				enable={{
					top: true,
					right: true,
					bottom: true,
					left: true,
					topRight: true,
					bottomRight: true,
					bottomLeft: true,
					topLeft: true,
				}}
				className={`relative ${
					isSelected ? 'ring-2 ring-blue-500' : ''
				}`}
			>
				<div
					ref={textRef}
					contentEditable={isEditing}
					suppressContentEditableWarning
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					style={{
						width: '100%',
						height: '100%',
						fontFamily: text.font,
						fontSize: `${text.fontSize}px`,
						color: text.color,
						backgroundColor: isSelected
							? 'rgba(255, 255, 255, 0.1)'
							: 'transparent',
						padding: '4px',
						outline: 'none',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						pointerEvents: isDragging ? 'none' : 'auto',
					}}
				>
					{isEditing ? editText : text.text}
				</div>
				{isSelected && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</Resizable>
		</div>
	);
};

export default DraggableText;
