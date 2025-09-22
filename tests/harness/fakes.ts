// Lightweight test doubles that match the runtime surface used by Query

export type ResultType = 'unknown' | 'complete';
export type Listener = (data: unknown, resultType: ResultType) => void;

export function makeTypedViewStub<T = any>() {
	const listeners: Listener[] = [];
	let destroyed = false;
	let data: T | undefined;

	const view = {
		addListener(listener: Listener) {
			listeners.push(listener);
			return () => {
				const i = listeners.indexOf(listener);
				if (i !== -1) listeners.splice(i, 1);
			};
		},
		destroy() {
			destroyed = true;
			listeners.length = 0;
		},
		updateTTL() {},
		get data() {
			return data as T;
		}
	} as any;

	function emit(value: T, resultType: ResultType = 'complete') {
		data = value;
		for (const l of listeners) l(value, resultType);
	}

	return {
		view,
		emit,
		get destroyed() {
			return destroyed;
		}
	};
}

export function makeZStub(opts?: { userID?: string }) {
	const created: Array<{ query: any; tv: ReturnType<typeof makeTypedViewStub> }> = [];
	let last: ReturnType<typeof makeTypedViewStub> | undefined;

	const z = {
		current: {
			userID: opts?.userID,
			materialize(query: any) {
				const tv = makeTypedViewStub();
				created.push({ query, tv });
				last = tv;
				return tv.view;
			},
			close() {}
		}
	} as any;

	return {
		z,
		get created() {
			return created;
		},
		get last() {
			return last!;
		}
	};
}
