// Lightweight test doubles that match the runtime surface used by Query

export type ResultType = 'unknown' | 'complete';
export type Listener = (data: unknown, resultType: ResultType) => void;

function deepFreeze<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') return obj;
	if (Object.isFrozen(obj)) return obj;
	for (const key of Object.keys(obj as Record<string, unknown>)) {
		const val = (obj as Record<string, unknown>)[key];
		deepFreeze(val as unknown as T);
	}
	return Object.freeze(obj as object) as T;
}

export function makeTypedViewStub<T = unknown>() {
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
	};

	function emit(value: T, resultType: ResultType = 'complete') {
		// Mimic Zero snapshots: clone then deep-freeze to ensure immutability
		const frozen = deepFreeze(structuredClone(value));
		data = frozen as T;
		for (const l of listeners) l(frozen as unknown, resultType);
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
	const created: Array<{ query: unknown; tv: ReturnType<typeof makeTypedViewStub> }> = [];
	let last: ReturnType<typeof makeTypedViewStub> | undefined;

	const zeroInstance = {
		userID: opts?.userID,
		clientID: opts?.userID, // For stubs, clientID same as userID
		query: {} as unknown, // Mock query builder
		mutate: {} as unknown, // Mock mutate
		materialize(query: unknown) {
			const tv = makeTypedViewStub();
			created.push({ query, tv });
			last = tv;
			return tv.view;
		},
		close() {}
	};

	const z = {
		// Getter proxies (mimicking the real Z class)
		get query() {
			return zeroInstance.query;
		},
		get mutate() {
			return zeroInstance.mutate;
		},
		get clientID() {
			return zeroInstance.clientID;
		},
		get userID() {
			return zeroInstance.userID;
		},
		materialize(query: unknown) {
			return zeroInstance.materialize(query);
		},
		close() {
			return zeroInstance.close();
		},
		// Backward compatibility
		get current() {
			return zeroInstance;
		}
	};

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
