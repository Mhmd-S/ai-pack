import { Decal, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface ImageDecalProps {
	url: string;
	parentGeometry: THREE.BufferGeometry;
}

const ImageDecal = ({ url, parentGeometry }: ImageDecalProps) => {
	const texture = useTexture(url);

	return (
		<Decal
			debug
			position={parentGeometry.boundingSphere?.center}
			scale={0.5}
			map={texture}
			rotation={new THREE.Euler(0, 0, 0)}
			material-depthTest={true}
		/>
	);
};

export default ImageDecal;
