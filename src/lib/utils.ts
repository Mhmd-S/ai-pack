import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as THREE from 'three';
import { set } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function rgbToHex(color: {b: number, g:number, r:number}) {
  return `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
}


// Helper to generate combinations
export function getCombinations<T>(array: T[], size: number): T[][] {
	const result: T[][] = [];
	function comb(start: number, chosen: T[]) {
		if (chosen.length === size) {
			result.push([...chosen]);
			return;
		}
		for (let i = start; i < array.length; i++) {
			chosen.push(array[i]);
			comb(i + 1, chosen);
			chosen.pop();
		}
	}
	comb(0, []);
	return result;
}

// Helper to check for coplanarity
export function areCoplanar(points: THREE.Vector3[], epsilon = 0.01): boolean {
	if (points.length < 4) return true;
	const [p1, p2, p3, p4] = points;
	const v1 = new THREE.Vector3().subVectors(p2, p1);
	const v2 = new THREE.Vector3().subVectors(p3, p1);
	const v3 = new THREE.Vector3().subVectors(p4, p1);
	const tripleProduct = v3.dot(new THREE.Vector3().crossVectors(v1, v2));
	return Math.abs(tripleProduct) < epsilon;
}

// Helper to sort points to form a convex quadrilateral
export function sortPoints(points: THREE.Vector3[]): THREE.Vector3[] {
	if (points.length !== 4) return points;

	// Find the centroid
	const center = new THREE.Vector3();
	points.forEach(p => center.add(p));
	center.divideScalar(4);

	// Find a normal vector (any two non-collinear vectors from the points will do)
	const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
	const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
	const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

	// Sort points by angle around the centroid
	return points.sort((a, b) => {
		const vA = new THREE.Vector3().subVectors(a, center);
		const vB = new THREE.Vector3().subVectors(b, center);
		const cross = new THREE.Vector3().crossVectors(vA, vB);
		const dot = vA.dot(vB);
		return cross.dot(normal) > 0 ? -1 : dot > 0 ? -1 : 1;
	});
}

export function getQuadrilateralArea(points: THREE.Vector3[]): number {
	if (points.length !== 4) return 0;
	const [p0, p1, p2, p3] = points;
	const d1 = new THREE.Vector3().subVectors(p2, p0);
	const d2 = new THREE.Vector3().subVectors(p3, p1);
	return d1.cross(d2).length() * 0.5;
}


export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const imgElement = document.createElement('img');
    
    imgElement.onload = () => {
      const dimensions = {
        width: imgElement.naturalWidth,
        height: imgElement.naturalHeight
      };
      resolve(dimensions);
    };
    
    imgElement.onerror = () => {
      console.error('Failed to load image for dimension calculation');
      reject(new Error('Failed to load image'));
    };
    
    imgElement.src = url;
  });
}

export function getImageAspectRatio(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      img.remove(); // Clean up immediately
      resolve(aspectRatio);
    };
    
    img.onerror = () => {
      img.remove();
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}