import { useEffect, RefObject, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

interface UseImageDropProps {
	meshRef: RefObject<THREE.Mesh>;
	onImageDrop: (imageUrl: string) => void;
}

export const useImageDrop = ({ meshRef, onImageDrop }: UseImageDropProps) => {
	const { gl, camera, raycaster } = useThree();

	const handleDrop = useCallback(
		(event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();

			if (!meshRef.current) return;

			// Calculate pointer position in normalized device coordinates (-1 to +1) for raycasting
			const rect = gl.domElement.getBoundingClientRect();
			const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			const pointerVector = new THREE.Vector2(x, y);

			raycaster.setFromCamera(pointerVector, camera);
			const intersects = raycaster.intersectObject(meshRef.current, false); // Raycast against this specific mesh

			// Check if the first intersected object is our mesh
			if (
				intersects.length > 0 &&
				intersects[0].object === meshRef.current
			) {
				const file = event.dataTransfer?.files[0];
				if (file && file.type.startsWith('image/')) {
					const reader = new FileReader();
					reader.onload = (e) => {
						if (e.target?.result) {
							onImageDrop(e.target.result as string);
						}
					};
					reader.readAsDataURL(file);
				}
			}
		},
		[gl, camera, raycaster, meshRef, onImageDrop]
	);

	useEffect(() => {
		const canvas = gl.domElement;

		const handleDragOver = (event: DragEvent) => {
			event.preventDefault(); // Necessary to allow dropping
		};

		canvas.addEventListener('dragover', handleDragOver);
		canvas.addEventListener('drop', handleDrop);

		// Cleanup function to remove event listeners
		return () => {
			canvas.removeEventListener('dragover', handleDragOver);
			canvas.removeEventListener('drop', handleDrop);
		};
	}, [gl, handleDrop]);
}; 