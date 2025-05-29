import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
	OrbitControls,
	PerspectiveCamera,
	Environment,
	Select,
} from '@react-three/drei';
import Model from '@/components/edit/Model';
import { OBJModelEditProps } from '@/lib/definitions';

// Main component
const OBJModelEdit: React.FC<OBJModelEditProps> = (props) => {
	const [isLoading, setIsLoading] = useState(true);

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%' }}>
			<Canvas
				style={{
					width: '100%',
					height: '100%',
					background: '#1f2937',
				}}
				onCreated={() => setIsLoading(false)}
			>
				<PerspectiveCamera makeDefault position={[5, 5, 3]} />
				<OrbitControls enableDamping dampingFactor={0.05} />

				<ambientLight intensity={0.8} />
				<directionalLight
					position={[10, 10, 10]}
					intensity={1.2}
					castShadow
				/>
				<directionalLight position={[-10, 10, -10]} intensity={0.7} />
				<directionalLight position={[0, -5, -10]} intensity={0.5} />

				<Environment preset="city" />
				<Select box multiple onChange={console.log} filter={items => items.length > 0}>
					{props.objPath && !isLoading && <Model {...props} />}
				</Select>
			</Canvas>

			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
					<div className="flex flex-col items-center gap-3 p-4 bg-slate-800/80 rounded-lg shadow-xl">
						<div className="w-8 h-8 border-4 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
						<p className="text-sm font-medium text-slate-200">
							Loading Preview...
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default OBJModelEdit;
