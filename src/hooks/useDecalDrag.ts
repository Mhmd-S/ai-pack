import { useState, useRef, useEffect } from "react";
import { useDrag } from "@use-gesture/react";
import { useThree, ThreeEvent } from "@react-three/fiber";
import { useSelect, useCursor } from "@react-three/drei";
import * as THREE from "three";

interface UseDecalDragProps {
  id: string;
  isSelected: boolean;
  center: THREE.Vector3;
  boundingBox: THREE.Box3;
  initialRotation: [number, number, number];
  onDelete: (id: string) => void;
  materialProps: any;
  onUpdate: (props: any) => void;
  disableDrag?: boolean;
  disableKeyboardDelete?: boolean;
  onPointerDown?: () => void;
  isResizing?: boolean;
  isRotating?: boolean;
  setIsMoving?: (isMoving: boolean) => void;
}

export const useDecalDrag = ({
  id,
  isSelected,
  center,
  boundingBox,
  initialRotation,
  onDelete,
  materialProps,
  onUpdate,
  disableDrag = false,
  disableKeyboardDelete = false,
  onPointerDown,
  isResizing = false,
  isRotating = false,
  setIsMoving,
}: UseDecalDragProps) => {
  const hasInitialized = useRef(false);
  const intersectionPoint = useRef(new THREE.Vector3());

  // Get access to R3F's state, including camera and raycaster
  const { camera, raycaster } = useThree();

  // Reset initialization flag when key props change
  useEffect(() => {
    hasInitialized.current = false;
  }, [id]);

  // Position offset calculation - only run once per decal instance
  useEffect(() => {
    // Skip if already initialized
    if (hasInitialized.current) return;

    const offset = 0.02;
    let { x, y, z } = center;

    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);

    if (absX > absY && absX > absZ) {
      x += Math.sign(x) * offset;
    } else if (absY > absX && absY > absZ) {
      y += Math.sign(y) * offset;
    } else {
      z += Math.sign(z) * offset;
    }

    onUpdate({
      rotation: [initialRotation[0], initialRotation[1], initialRotation[2]],
    });
    onUpdate({ position: [x, y, z] });
    hasInitialized.current = true;
  }, [center, initialRotation, onUpdate]);

  // Refs to store drag-related 3D data
  const dragPlane = useRef(new THREE.Plane());
  const dragStartPoint = useRef(new THREE.Vector3());
  const dragOffset = useRef(new THREE.Vector3());

  // Helper function to calculate effective dimensions after rotation
  const getEffectiveDimensions = (
    scale: [number, number],
    rotation: [number, number, number]
  ) => {
    const [width, height] = scale;
    const [rx, ry, rz] = rotation;

    // Create a box with the original dimensions
    const originalBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(width, height, 0)
    );

    // Apply rotation to the box
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(rx, ry, rz)
    );

    // Get the 8 corners of the box
    const corners = [
      new THREE.Vector3(
        originalBox.min.x,
        originalBox.min.y,
        originalBox.min.z
      ),
      new THREE.Vector3(
        originalBox.max.x,
        originalBox.min.y,
        originalBox.min.z
      ),
      new THREE.Vector3(
        originalBox.min.x,
        originalBox.max.y,
        originalBox.min.z
      ),
      new THREE.Vector3(
        originalBox.max.x,
        originalBox.max.y,
        originalBox.min.z
      ),
      new THREE.Vector3(
        originalBox.min.x,
        originalBox.min.y,
        originalBox.max.z
      ),
      new THREE.Vector3(
        originalBox.max.x,
        originalBox.min.y,
        originalBox.max.z
      ),
      new THREE.Vector3(
        originalBox.min.x,
        originalBox.max.y,
        originalBox.max.z
      ),
      new THREE.Vector3(
        originalBox.max.x,
        originalBox.max.y,
        originalBox.max.z
      ),
    ];

    // Transform all corners
    const transformedCorners = corners.map((corner) =>
      corner.applyMatrix4(rotationMatrix)
    );

    // Calculate the new bounding box
    const rotatedBox = new THREE.Box3().setFromPoints(transformedCorners);
    const size = new THREE.Vector3();
    rotatedBox.getSize(size);

    return {
      halfWidth: size.x / 2,
      halfHeight: size.y / 2,
      halfDepth: size.z / 2,
    };
  };

  const bind = useDrag(
    ({ event, down, first, last, dragging }) => {
      event.stopPropagation();

      if (isResizing || isRotating || !isSelected || disableDrag) return;

      if (dragging) {
        setIsMoving?.(true);
      } else {
        setIsMoving?.(false);
        onPointerDown?.();
      }

      const e = event as unknown as ThreeEvent<PointerEvent>;

      if (first) {
        setIsMoving?.(true);
        // On first drag event, calculate the drag plane

        // 1. Find intersection point on the DecalMesh
        const intersection = e.intersections[0];
        if (!intersection) return; // Should not happen if drag starts on the object
        dragStartPoint.current.copy(intersection.point);

        // 2. Create a plane at that point, oriented towards the camera
        dragPlane.current.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(dragPlane.current.normal),
          dragStartPoint.current
        );

        // 3. Calculate offset between current decal position and drag start point
        const currentPosition = new THREE.Vector3(
          materialProps.position[0],
          materialProps.position[1],
          materialProps.position[2]
        );
        dragOffset.current.subVectors(currentPosition, dragStartPoint.current);

        // Don't update position on first event, just set up the plane
        return;
      }

      // On every subsequent drag event, raycast onto the plane

      raycaster.ray.intersectPlane(
        dragPlane.current,
        intersectionPoint.current
      );

      // Apply the offset to maintain relative position
      intersectionPoint.current.add(dragOffset.current);

      // Calculate effective dimensions after rotation
      const currentScale = materialProps.scale || [1, 1];
      const currentRotation = materialProps.rotation || [0, 0, 0];
      const { halfWidth, halfHeight, halfDepth } = getEffectiveDimensions(
        currentScale,
        currentRotation
      );

      // Clamp the position to stay within parent geometry bounds
      // considering the decal's effective dimensions after rotation
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      let newPosition: [number, number, number];

      // The smallest dimension of the bounding box tells us the plane's normal direction.
      if (size.z < size.x && size.z < size.y) {
        // XY plane is dominant (normal along Z)
        const clampedX = Math.max(
          boundingBox.min.x + halfWidth,
          Math.min(boundingBox.max.x - halfWidth, intersectionPoint.current.x)
        );
        const clampedY = Math.max(
          boundingBox.min.y + halfHeight,
          Math.min(boundingBox.max.y - halfHeight, intersectionPoint.current.y)
        );
        newPosition = [clampedX, clampedY, materialProps.position[2]];
      } else if (size.y < size.x && size.y < size.z) {
        // XZ plane is dominant (normal along Y)
        const clampedX = Math.max(
          boundingBox.min.x + halfWidth,
          Math.min(boundingBox.max.x - halfWidth, intersectionPoint.current.x)
        );
        const clampedZ = Math.max(
          boundingBox.min.z + halfDepth,
          Math.min(boundingBox.max.z - halfDepth, intersectionPoint.current.z)
        );
        newPosition = [clampedX, materialProps.position[1], clampedZ];
      } else {
        // YZ plane is dominant (normal along X)
        const clampedY = Math.max(
          boundingBox.min.y + halfHeight,
          Math.min(boundingBox.max.y - halfHeight, intersectionPoint.current.y)
        );
        const clampedZ = Math.max(
          boundingBox.min.z + halfDepth,
          Math.min(boundingBox.max.z - halfDepth, intersectionPoint.current.z)
        );
        newPosition = [materialProps.position[0], clampedY, clampedZ];
      }

      // Update state via onUpdate callback
      onUpdate({ position: newPosition });
    },
    {
      // We need to use pointer events to get intersection data from R3F
      eventOptions: { pointer: true } as any,
    }
  );

  // Add keyboard event listener for delete key
  useEffect(() => {
    if (disableKeyboardDelete) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onDelete(id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [id, onDelete, disableKeyboardDelete]);

  const handleRotationUpdate = (newRotation: [number, number, number]) => {
    onUpdate({ rotation: newRotation });
  };

  const handleUpdate = (newProps: {
    scale: [number, number];
    position: [number, number, number];
  }) => {
    onUpdate({ scale: newProps.scale, position: newProps.position });
  };

  return {
    bind,
    handleRotationUpdate,
    handleUpdate,
  };
};
