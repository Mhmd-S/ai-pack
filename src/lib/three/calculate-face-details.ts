import * as THREE from 'three';
import {
	getCombinations,
	areCoplanar,
	sortPoints,
	getQuadrilateralArea,
} from '@/lib/utils';

export const calculateFaceDetails = (mesh: THREE.Mesh) => {
	if (!mesh) {
		return null;
	}

	mesh.geometry.computeBoundingBox();
	const boundingBox = mesh.geometry.boundingBox;

	if (boundingBox) {
		const { min, max } = boundingBox;
		const corners = [
			new THREE.Vector3(min.x, min.y, min.z),
			new THREE.Vector3(min.x, min.y, max.z),
			new THREE.Vector3(min.x, max.y, min.z),
			new THREE.Vector3(min.x, max.y, max.z),
			new THREE.Vector3(max.x, min.y, min.z),
			new THREE.Vector3(max.x, min.y, max.z),
			new THREE.Vector3(max.x, max.y, min.z),
			new THREE.Vector3(max.x, max.y, max.z),
		];

		const worldCorners = corners.map((corner) =>
			corner.clone().applyMatrix4(mesh.matrixWorld)
		);

		const pointCombinations = getCombinations(worldCorners, 4);
		let bestFacePoints: THREE.Vector3[] | null = null;
		let maxArea = 0;

		for (const combination of pointCombinations) {
			if (areCoplanar(combination)) {
				const sortedPoints = sortPoints(combination);
				const area = getQuadrilateralArea(sortedPoints);

				if (area > maxArea) {
					maxArea = area;
					bestFacePoints = sortedPoints;
				}
			}
		}

		if (bestFacePoints) {
			const [p0, p1, p2, p3] = bestFacePoints;

			const v1 = new THREE.Vector3().subVectors(p1, p0);
			const v2 = new THREE.Vector3().subVectors(p3, p0);

			const faceNormal = new THREE.Vector3().crossVectors(v1, v2).normalize();

			const faceCenter = new THREE.Vector3()
				.add(p0)
				.add(p1)
				.add(p2)
				.add(p3)
				.multiplyScalar(0.25);

			// Ensure the normal points away from the origin. If the dot product of the
			// normal and the vector to the face center is negative, the normal is
			// pointing towards the origin, so we invert it.
			if (faceNormal.dot(faceCenter) < 0) {
				faceNormal.negate();
			}

			// Calculate angle on the ZX plane
			const projectedNormal = new THREE.Vector3(
				faceNormal.x,
				0,
				faceNormal.z
			).normalize();

			let angleZX = 0;
			if (projectedNormal.lengthSq() > 0.001) {
				angleZX = Math.atan2(projectedNormal.x, projectedNormal.z);
			}
			const faceBoundingBox = new THREE.Box3().setFromPoints(bestFacePoints);

			return { faceNormal, faceCenter, angleZX, boundingBox: faceBoundingBox };
		}
	}

	return null;
}; 