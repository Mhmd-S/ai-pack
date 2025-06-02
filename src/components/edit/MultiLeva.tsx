import {
	LevaPanel,
	useControls as useControlsImpl,
	useCreateStore,
} from 'leva';

export function Panel({ selected }) {
	return (
		<LevaPanel
			store={selected[0]?.userData.store}
			titleBar={{ title: selected.map(() => '●').join(' ') }}
		/>
	);
}

export function useControlsDecals(selected, props) {
	const store = useCreateStore();
	const isFirst = selected[0] === store;

	// Use the functional form to get the 'set' function
	const [decalProps, set] = useControlsImpl(
		() =>
			Object.keys(props).reduce(
				(acc, key) => ({
					...acc,
					[key]: {
						...props[key],
						transient: false,
						onChange: (value, path, ctx) =>
							!ctx.initial &&
							isFirst &&
							selected.length > 1 &&
							selected.forEach(
								(s, i) => i > 0 && s.setValueAtPath(path, value)
							),
						render: (get) =>
							selected.length === 1 ||
							selected.every((store) => store.getData()[key]),
					},
				}),
				{}
			),
		{ store },
		[selected]
	);

	// Now 'set' is the proper Leva setter function
	return [store, decalProps, set];
}

export function useControlsFaceMesh(selected, props) {
	const store = useCreateStore();
	const isFirst = selected[0] === store;

	// Use the functional form to get the 'set' function
	const [materialProps, set] = useControlsImpl(
		() =>
			Object.keys(props).reduce(
				(acc, key) => ({
					...acc,
					[key]: {
						...props[key],
						transient: false,
						onChange: (value, path, ctx) =>
							!ctx.initial &&
							isFirst &&
							selected.length > 1 &&
							selected.forEach(
								(s, i) => i > 0 && s.setValueAtPath(path, value)
							),
						render: (get) =>
							selected.length === 1 ||
							selected.every((store) => store.getData()[key]),
					},
				}),
				{}
			),
		{ store },
		[selected]
	);

	// Now 'set' is the proper Leva setter function
	return [store, materialProps, set];
}
