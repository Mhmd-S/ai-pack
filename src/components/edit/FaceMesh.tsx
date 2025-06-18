// ... existing code ...
import { useState, useEffect, useRef } from 'react'; // Added useEffect, useRef
import { useSelect, Edges, useCursor, Select } from '@react-three/drei';
import { useThree } from '@react-three/fiber'; // Added useThree
import { useControlsFaceMesh } from '@/components/edit/MultiLeva';
import * as THREE from 'three';
import { rgbToHex } from '@/lib/utils';
import ImageDecal from './Decals/ImageDecal';

interface FaceMeshProps {
	geometry: THREE.BufferGeometry;
	material: THREE.Material;
}

const FaceMesh = ({ geometry, material }: FaceMeshProps) => {
	const meshRef = useRef<THREE.Mesh>(null!); // Ref for this specific mesh instance

	const [hovered, setHover] = useState(false);
	const [images, setImages] = useState<string[]>([]);

	const selectedUserDataStores = useSelect().map((sel) => sel.userData.store); // Renamed for clarity

	// gl: WebGLRenderer, scene, camera, raycaster, pointer (normalized mouse coords) are from useThree
	const { gl, camera, raycaster } = useThree();

	const defaultColor = { r: 255, g: 255, b: 255 };

	// Assuming 'store' is unique per FaceMesh instance or a group it belongs to
	const [store, materialProps] = useControlsFaceMesh(selectedUserDataStores, {
		color: { value: defaultColor },
	});

	const isSelected = !!selectedUserDataStores.find((s) => s === store);
	useCursor(hovered);

	useEffect(() => {
		const canvas = gl.domElement;

		const handleDragOver = (event: DragEvent) => {
			event.preventDefault(); // Necessary to allow dropping
		};

		const handleDrop = (event: DragEvent) => {
			event.preventDefault();
			event.stopPropagation();

			if (!meshRef.current) return;

			// Calculate pointer position in normalized device coordinates (-1 to +1) for raycasting
			const rect = canvas.getBoundingClientRect();
			const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			const pointerVector = new THREE.Vector2(x, y);

			raycaster.setFromCamera(pointerVector, camera);
			const intersects = raycaster.intersectObject(
				meshRef.current,
				false
			); // Raycast against this specific mesh

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
							const newImageUrl = e.target.result as string;
							setImages((prevImages) => [
								...prevImages,
								newImageUrl,
							]);
						}
					};
					reader.readAsDataURL(file);
				}
			}
		};

		canvas.addEventListener('dragover', handleDragOver);
		canvas.addEventListener('drop', handleDrop);

		// Cleanup function to remove event listeners
		return () => {
			canvas.removeEventListener('dragover', handleDragOver);
			canvas.removeEventListener('drop', handleDrop);
		};
	}, [gl, camera, raycaster, meshRef, setImages, store]); // Dependencies for useEffect

	return (
		<mesh
			ref={meshRef} // Assign the ref to the mesh
			geometry={geometry}
			onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
			onPointerOut={() => setHover(false)}
			userData={{ store }}
		>
			<Edges
				visible={isSelected}
				lineWidth={5}
				color="#ff6600"
				scale={1}
				renderOrder={1000}
			>
				<meshBasicMaterial transparent color="#333" depthTest={false} />
			</Edges>
			<meshStandardMaterial color={rgbToHex(materialProps?.color)} />
			
			{meshRef.current &&
				images.map((image, index) => (
					<ImageDecal
						meshRef={meshRef}
						url={image}
						parentGeometry={geometry}
						key={`${image}-${index}`} // More robust key
					/>
				))}
		</mesh>
	);
};

export default FaceMesh;
