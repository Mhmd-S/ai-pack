import * as THREE from "three";
import {
  getCombinations,
  areCoplanar,
  sortPoints,
  getQuadrilateralArea,
} from "@/lib/utils";

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

      const projectedNormal = new THREE.Vector3(
        faceNormal.x,
        faceNormal.y,
        faceNormal.z
      ).normalize();

      let rotation: [number, number, number] = [0, 0, 0];

      // Calculate Euler angles from the normal vector
      // Y-axis rotation (pitch) - rotation around X axis
      rotation[0] = Math.atan2(
        projectedNormal.y,
        Math.sqrt(
          Math.pow(projectedNormal.x, 2) + Math.pow(projectedNormal.z, 2)
        )
      );

      // X-axis rotation (yaw) - rotation around Y axis
      rotation[1] = Math.atan2(projectedNormal.x, projectedNormal.z);

      // Z-axis rotation (roll) - rotation around Z axis
      rotation[2] = 0;

      const faceBoundingBox = new THREE.Box3().setFromPoints(bestFacePoints);

      let size = new THREE.Vector3();
      faceBoundingBox.getSize(size);

      let horizontalAxis = "x";
      let verticalAxis = "y";

      // If Z is the smallest dimension -> XY plane is dominant (normal along Z)
      if (size.z < size.x && size.z < size.y) {
        horizontalAxis = "x";
        verticalAxis = "y";
      } else if (size.y < size.x && size.y < size.z) {
        horizontalAxis = "x";
        verticalAxis = "z";
      } else {
        horizontalAxis = "z";
        verticalAxis = "y";
      }

      return {
        faceNormal,
        faceCenter,
        rotation,
        boundingBox: faceBoundingBox,
        size,
        horizontalAxis,
        verticalAxis,
      };
    }
  }

  return null;
};
