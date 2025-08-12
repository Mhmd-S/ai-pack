import { useRef, useEffect } from "react";
import { useDrag } from "@use-gesture/react";
import { useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

interface UseDecalDragProps {
  id: string;
  isSelected: boolean;
  center: THREE.Vector3;
  boundingBox: THREE.Box3;
  normal: THREE.Vector3;
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
  normal,
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

    const offset = 0.03;
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
      rotation: initialRotation,
      position: [x, y, z],
    });
    hasInitialized.current = true;
  }, [center, initialRotation, onUpdate]);

  // Refs to store drag-related 3D data
  const dragPlane = useRef(new THREE.Plane());
  const dragStartPoint = useRef(new THREE.Vector3());
  const dragOffset = useRef(new THREE.Vector3());

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

      if (dragging) {
        setIsMoving?.(true);

        // On every subsequent drag event, raycast onto the plane
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

      // On every subsequent drag event, raycast onto the plane
      raycaster.ray.intersectPlane(
        dragPlane.current,
        intersectionPoint.current
      );

      // Apply the offset to maintain relative position
      intersectionPoint.current.add(dragOffset.current);

        let newPosition: [number, number, number];

        // The smallest dimension of the bounding box tells us the plane's normal direction.
        if (size.z < size.x && size.z < size.y) {
          // XY plane is dominant (normal along Z)
          const minX = (size.x / 2) * -1;
          const maxX = size.x / 2;
          const minY = (size.y / 2) * -1;
          const maxY = size.y / 2;

          // Clamp the intersection point so that the decal never leaves the bounds
          const clampedX = Math.min(
            Math.max(intersectionPoint.current.x, minX),
            maxX
          );
          const clampedY = Math.min(
            Math.max(intersectionPoint.current.y, minY),
            maxY
          );
          newPosition = [clampedX, clampedY, materialProps.position[2]];
        } else if (size.y < size.x && size.y < size.z) {
          // XZ plane is dominant (normal along Y)
          const minX = (size.x / 2) * -1;
          const maxX = size.x / 2;
          const minZ = (size.z / 2) * -1;
          const maxZ = size.z / 2;

          // Clamp the intersection point so that the decal never leaves the bounds
          const clampedX = Math.min(
            Math.max(intersectionPoint.current.x, minX),
            maxX
          );
          const clampedZ = Math.min(
            Math.max(intersectionPoint.current.z, minZ),
            maxZ
          );
          newPosition = [clampedX, materialProps.position[1], clampedZ];
        } else {
          // YZ plane is dominant (normal along X)
          const minY = (size.y / 2) * -1;
          const maxY = size.y / 2;
          const minZ = (size.z / 2) * -1;
          const maxZ = size.z / 2;

          // Clamp the intersection point so that the decal never leaves the bounds
          const clampedY = Math.min(
            Math.max(intersectionPoint.current.y, minY),
            maxY
      );
          const clampedZ = Math.min(
            Math.max(intersectionPoint.current.z, minZ),
            maxZ
          );
          newPosition = [materialProps.position[0], clampedY, clampedZ];
        }

        onUpdate({ position: newPosition });
      } else {
        setIsMoving?.(false);
        onPointerDown?.();
      }
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
