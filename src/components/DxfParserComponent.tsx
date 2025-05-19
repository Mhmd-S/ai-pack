import React, {
	useState,
	useEffect,
	useRef,
	ChangeEvent,
	useCallback,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import DxfParser, { IEntity, ILineEntity, IDxf } from 'dxf-parser';

// Helper to get a material color.
// The 'parsedColorValue' is expected to be a decimal representation of a hex color,
// as provided by dxf-parser's entity.color property from the console logs.
const getMaterialByParsedColor = (
	parsedColorValue?: number
): THREE.LineBasicMaterial => {
	let hexColor;
	if (typeof parsedColorValue === 'number') {
		hexColor = parsedColorValue; // Directly use the value as it appears to be the resolved color
	} else {
		hexColor = 0x0000ff; // Default to blue if no color is provided
	}
	return new THREE.LineBasicMaterial({ color: hexColor });
};

const createFlatDxfModel = (parsedDxf: IDxf): THREE.Group | null => {
	if (!parsedDxf || !parsedDxf.entities || parsedDxf.entities.length === 0) {
		console.warn('DXF data is null or has no entities for flat display.');
		return null;
	}

	const group = new THREE.Group();
	console.log(
		`Processing ${parsedDxf.entities.length} entities for flat display.`
	);

	parsedDxf.entities.forEach((entity: IEntity, index: number) => {
		if (entity.type === 'LINE') {
			const lineEntity = entity as ILineEntity;
			if (!lineEntity.vertices || lineEntity.vertices.length < 2) {
				console.warn(
					`Line entity at index ${index} has insufficient vertices.`
				);
				return;
			}

			// Use absolute coordinates from the DXF for a flat display
			const p1 = new THREE.Vector3(
				lineEntity.vertices[0].x,
				lineEntity.vertices[0].y,
				lineEntity.vertices[0].z || 0
			);
			const p2 = new THREE.Vector3(
				lineEntity.vertices[1].x,
				lineEntity.vertices[1].y,
				lineEntity.vertices[1].z || 0
			);

			const length = p1.distanceTo(p2);
			if (length < 0.0001) {
				// console.warn(`Line entity at index ${index} has near-zero length. Skipping.`);
				return; // Optionally skip zero-length lines
			}

			// Use the new function that directly uses the parsed color value
			const material = getMaterialByParsedColor(entity.color);

			const points = [p1, p2];
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			const lineSegmentMesh = new THREE.LineSegments(geometry, material);

			// No rotation or sequential positioning needed for flat display
			group.add(lineSegmentMesh);

			console.log(
				`Added segment ${index}: Layer=${lineEntity.layer}, ColorACI=${entity.color}, ` +
					`P1=(${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(
						2
					)}), ` +
					`P2=(${p2.x.toFixed(2)},${p2.y.toFixed(2)},${p2.z.toFixed(
						2
					)}), Length=${length.toFixed(2)}`
			);
		}
		// Can add handlers for other entity types (ARC, CIRCLE, LWPOLYLINE, POLYLINE) here for a more complete flat display
		// For LWPOLYLINE and POLYLINE, iterate through vertices and create line segments between them.
	});

	if (group.children.length === 0) {
		console.warn(
			'No line segments were added to the group for flat display.'
		);
		return null;
	}
	console.log(
		`Finished processing entities for flat display. Total segments in group: ${group.children.length}`
	);
	return group;
};

const DxfParserComponent: React.FC = () => {
	const mountRef = useRef<HTMLDivElement>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const controlsRef = useRef<OrbitControls | null>(null);
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const animationFrameIdRef = useRef<number | null>(null);

	const [dxfData, setDxfData] = useState<IDxf | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string>('');

	const handleFileChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				setDxfData(null);
				setError(null);
				setFileName('');
				return;
			}

			setFileName(file.name);
			setError(null);

			try {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const fileContent = e.target?.result as string;
						const parser = new DxfParser();
						const parsedDxf = parser.parseSync(fileContent) as IDxf;
						console.log('DXF Parsed:', parsedDxf);
						setDxfData(parsedDxf);
					} catch (parseErrorUnknown: unknown) {
						const parseError = parseErrorUnknown as Error;
						console.error('Error parsing DXF:', parseError);
						setError(
							`Error parsing DXF: ${
								parseError.message || 'Unknown error'
							}`
						);
						setDxfData(null);
					}
				};
				reader.onerror = () => {
					setError('Error reading file.');
					setDxfData(null);
				};
				reader.readAsText(file);
			} catch (errUnknown: unknown) {
				const err = errUnknown as Error;
				setError(
					`Error processing file: ${err.message || 'Unknown error'}`
				);
				setDxfData(null);
			}
		},
		[]
	);

	useEffect(() => {
		if (!mountRef.current) {
			return;
		}
		const currentMount = mountRef.current;

		sceneRef.current = new THREE.Scene();
		sceneRef.current.background = new THREE.Color(0xeeeeee);

		cameraRef.current = new THREE.PerspectiveCamera(
			75,
			currentMount.clientWidth / currentMount.clientHeight,
			0.1,
			20000
		);
		cameraRef.current.position.set(100, 100, 200); // Adjusted camera for potentially larger flat drawings

		rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
		rendererRef.current.setSize(
			currentMount.clientWidth,
			currentMount.clientHeight
		);
		rendererRef.current.setPixelRatio(window.devicePixelRatio);
		currentMount.innerHTML = '';
		currentMount.appendChild(rendererRef.current.domElement);

		if (cameraRef.current) {
			controlsRef.current = new OrbitControls(
				cameraRef.current,
				rendererRef.current.domElement
			);
			controlsRef.current.enableDamping = true;
			controlsRef.current.target.set(0, 0, 0);
		}

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
		sceneRef.current.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(50, 100, 75).normalize();
		sceneRef.current.add(directionalLight);

		const animate = () => {
			animationFrameIdRef.current = requestAnimationFrame(animate);
			controlsRef.current?.update();
			if (sceneRef.current && rendererRef.current && cameraRef.current) {
				rendererRef.current.render(sceneRef.current, cameraRef.current);
			}
		};
		animate();

		const handleResize = () => {
			if (rendererRef.current && currentMount && cameraRef.current) {
				cameraRef.current.aspect =
					currentMount.clientWidth / currentMount.clientHeight;
				cameraRef.current.updateProjectionMatrix();
				rendererRef.current.setSize(
					currentMount.clientWidth,
					currentMount.clientHeight
				);
			}
		};
		window.addEventListener('resize', handleResize);

		return () => {
			if (animationFrameIdRef.current) {
				cancelAnimationFrame(animationFrameIdRef.current);
			}
			window.removeEventListener('resize', handleResize);
			controlsRef.current?.dispose();

			sceneRef.current?.traverse((object) => {
				if (
					object instanceof THREE.Mesh ||
					object instanceof THREE.LineSegments
				) {
					object.geometry?.dispose();
					const material = object.material as
						| THREE.Material
						| THREE.Material[];
					if (Array.isArray(material)) {
						material.forEach((mat) => mat.dispose());
					} else {
						material?.dispose();
					}
				}
			});
			rendererRef.current?.dispose();
			if (currentMount) {
				currentMount.innerHTML = '';
			}
			sceneRef.current = null;
			rendererRef.current = null;
			controlsRef.current = null;
			cameraRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!sceneRef.current || !cameraRef.current || !controlsRef.current) {
			return;
		}

		const scene = sceneRef.current;
		const camera = cameraRef.current;
		const controls = controlsRef.current;

		const oldModel = scene.getObjectByName('dxfFlatModel');
		if (oldModel) {
			scene.remove(oldModel);
			oldModel.traverse((object) => {
				if (
					object instanceof THREE.Mesh ||
					object instanceof THREE.LineSegments
				) {
					object.geometry?.dispose();
					const objMaterial = object.material as
						| THREE.Material
						| THREE.Material[];
					if (Array.isArray(objMaterial)) {
						objMaterial.forEach((mat) => mat.dispose());
					} else {
						objMaterial?.dispose();
					}
				}
			});
		}

		if (dxfData) {
			// Using the new function for flat display
			const flatModel = createFlatDxfModel(dxfData);
			if (flatModel && flatModel.children.length > 0) {
				flatModel.name = 'dxfFlatModel';
				scene.add(flatModel);

				const box = new THREE.Box3().setFromObject(flatModel);
				if (!box.isEmpty()) {
					const center = box.getCenter(new THREE.Vector3());
					const size = box.getSize(new THREE.Vector3());
					const maxDim = Math.max(size.x, size.y, size.z);

					const fov = camera.fov * (Math.PI / 180);
					let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
					cameraZ *= 1.5; // Add some padding, look from a bit further for flat drawings

					// Adjust camera for flat XY plane viewing, assuming Z is mostly 0 for 2D DXFs
					camera.position.set(
						center.x,
						center.y,
						Math.max(cameraZ, size.z + 10)
					); // Look from positive Z
					camera.lookAt(center);
					controls.target.copy(center);
				} else {
					camera.position.set(0, 0, 200); // Default if box is empty
					camera.lookAt(0, 0, 0);
					controls.target.set(0, 0, 0);
				}
			} else {
				camera.position.set(0, 0, 200);
				camera.lookAt(0, 0, 0);
				controls.target.set(0, 0, 0);
			}
		} else {
			camera.position.set(0, 0, 200);
			camera.lookAt(0, 0, 0);
			controls.target.set(0, 0, 0);
		}
		controls.update();
	}, [dxfData]);

	return (
		<div
			style={{
				width: '100%',
				height: 'calc(100vh - 50px)',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'Arial, sans-serif',
			}}
		>
			<div
				style={{
					padding: '10px',
					borderBottom: '1px solid #ccc',
					backgroundColor: '#f9f9f9',
					display: 'flex',
					alignItems: 'center',
				}}
			>
				<input
					type="file"
					accept=".dxf"
					onChange={handleFileChange}
					style={{ marginRight: '15px' }}
				/>
				{fileName && (
					<span style={{ color: '#333' }}>
						Current file: <strong>{fileName}</strong>
					</span>
				)}
				{error && (
					<p
						style={{
							color: 'red',
							margin: '0 0 0 15px',
							fontWeight: 'bold',
						}}
					>
						Error: {error}
					</p>
				)}
			</div>
			<div
				ref={mountRef}
				style={{
					flexGrow: 1,
					width: '100%',
					overflow: 'hidden',
					position: 'relative',
				}}
			/>
		</div>
	);
};

export default DxfParserComponent;
