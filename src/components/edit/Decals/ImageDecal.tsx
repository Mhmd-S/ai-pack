import { Decal, useTexture, useSelect } from '@react-three/drei';
import RotationHandler from '../Handler/RotationHandler';

import * as THREE from 'three';
import { useDecalDrag } from '@/hooks/useDecalDrag';
import HandlerGroup from '../Handler/HandlerGroup';
import DecalMesh from './DecalMesh';
import { button } from 'leva';
import { useControlsDecals } from '@/components/edit/MultiLeva';

interface ImageDecalProps {
	url: string;
	parentGeometry: THREE.BufferGeometry;
	meshRef: React.RefObject<THREE.Mesh>;
	id: string;
	initialRotation: [number, number, number];
	normal: THREE.Vector3;
	center: THREE.Vector3;
	boundingBox: THREE.Box3;
	onDelete: (id: string) => void;
}

const ImageDecal = ({ url, meshRef, id, initialRotation, center, boundingBox, normal, onDelete }: ImageDecalProps) => {
	const texture = useTexture(url);
	const standardWidth = 0.5;
	const aspectRatio = texture.image
		? texture.image.height / texture.image.width
		: 1;
	const standardHeight = standardWidth * aspectRatio;

	const levaConfig = {
		position: {
			value: [center.x, center.y, center.z],
		},
		scale: {
			value: [standardWidth, standardHeight],
		},
		rotation: { value: initialRotation, render: () => false },
		delete: button((get) => {
			onDelete(id);
		}),
	};

	const selectedUserDataStores = useSelect().map((sel) => sel.userData.store);

	// @ts-ignore - useControlsDecals has incorrect typing for hiddenControls parameter
	const [store, materialProps, set] = useControlsDecals(
		selectedUserDataStores,
		levaConfig,
		// @ts-ignore
		["rotation"] // Hide rotation controls
	) as [any, any, (props: any) => void];

	const isSelected = !!selectedUserDataStores.find((s) => s === store);

	const {
		state,
		bind,
		handlers
	} = useDecalDrag({
		id,
		center,
		boundingBox,
		initialRotation,
		isSelected,
		onDelete,
		materialProps,
		onUpdate: set,
	});

	const currentScale = materialProps.scale || [1, 1];

	return (
		<>
			{/* Visual representation mesh */}
			{/* A interactable interface for the user, the decal itself is too rigid to control directly */}
			<group {...bind()}>
				<DecalMesh
					position={[
						materialProps.position[0],
						materialProps.position[1],
						materialProps.position[2],
					]}
					rotation={materialProps.rotation}
					scale={currentScale}
					isSelected={isSelected}
					isHovered={state.hovered}
					store={store}
					onPointerOver={handlers.handlePointerOver}
					onPointerOut={() => handlers.setHover(false)}
				/>
			</group>

			{/* The actual decal */}
			<Decal
				mesh={meshRef}
				position={[
					materialProps.position[0],
					materialProps.position[1],
					materialProps.position[2],
				]}
				scale={[currentScale[0], currentScale[1], currentScale[0]]}
				rotation={new THREE.Euler(materialProps.rotation[0], materialProps.rotation[1], materialProps.rotation[2])}
			>
				<meshBasicMaterial
					map={texture}
					polygonOffset
					polygonOffsetFactor={-2} // Prevents z-fighting
					transparent
				/>
			</Decal>

			{/* Handler group for resize handles */}
			{isSelected && (
				<>
					<HandlerGroup
						scale={currentScale}
						position={[
							materialProps.position[0],
							materialProps.position[1],
							materialProps.position[2],
						]}
						rotation={materialProps.rotation}
						onUpdate={handlers.handleUpdate}
						onHover={handlers.setHover}
						setIsResizing={handlers.setIsResizing}
						normal={normal}
					/>
					<RotationHandler
						position={[
							materialProps.position[0],
							materialProps.position[1],
							materialProps.position[2],
						]}
						scale={currentScale}
						rotation={materialProps.rotation}
						normal={normal}
						onUpdate={handlers.handleRotationUpdate}
						onHover={handlers.setHover}
						setIsRotating={handlers.setIsRotating}
					/>
				</>
			)}
		</>
	);
};

export default ImageDecal;
