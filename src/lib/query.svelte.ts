import type {
	Entry,
	HumanReadable,
	Query as QueryDef,
	ReadonlyJSONValue,
	Schema,
	TypedView
} from '@rocicorp/zero';
import { getContext } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import type { Z } from './Z.svelte.js';
// Not sure why, TS doesn't really want to allow the import using @rocicorp/zero directly
// this should end up as './shared/immutable.js
import type { Immutable } from '../../node_modules/@rocicorp/zero/out/shared/src/immutable.d.ts';

export type ResultType = 'unknown' | 'complete';
export type QueryResultDetails = { type: ResultType };
export type QueryResult<TReturn> = readonly [HumanReadable<TReturn>, QueryResultDetails];

const emptyArray: unknown[] = [];
const defaultSnapshots = {
	singular: [undefined, { type: 'unknown' }] as const,
	plural: [emptyArray, { type: 'unknown' }] as const
};

function getDefaultSnapshot<TReturn>(singular: boolean): QueryResult<TReturn> {
	return (singular ? defaultSnapshots.singular : defaultSnapshots.plural) as QueryResult<TReturn>;
}

class ViewWrapper<
	TSchema extends Schema,
	TTable extends keyof TSchema['tables'] & string,
	TReturn
> {
	#view: TypedView<HumanReadable<TReturn>> | undefined;
	#data = $state<Entry>({ '': undefined });
	#status = $state<QueryResultDetails>({ type: 'unknown' });
	#subscribe: () => void;
	readonly #refCountMap = new WeakMap<Entry, number>();

	constructor(
		private zero: Z<TSchema>,
		private query: QueryDef<TSchema, TTable, TReturn>,
		private onMaterialized: (view: ViewWrapper<TSchema, TTable, TReturn>) => void,
		private onDematerialized: () => void
	) {
		// Initialize the data based on format
		this.#data = { '': this.query.format.singular ? undefined : [] };

		// Create a subscriber that manages view lifecycle
		this.#subscribe = createSubscriber((update) => {
			this.#materializeIfNeeded();

			if (this.#view) {
				// Pass the update function to onData so it can notify Svelte of changes
				this.#view.addListener((snap, resultType) => this.#onData(snap, resultType, update));
			}

			// Return cleanup function that will only be called
			// when all effects are destroyed
			return () => {
				this.#view?.destroy();
				this.#view = undefined;
				this.onDematerialized();
			};
		});
	}

	#onData = (
		snap: Immutable<HumanReadable<TReturn>>,
		resultType: ResultType,
		update: () => void // not used??
	) => {
		const data =
			snap === undefined
				? snap
				: (structuredClone(snap as ReadonlyJSONValue) as HumanReadable<TReturn>);
		// Clear old references
		this.#refCountMap.delete(this.#data);

		// Update data and track new references
		this.#data = { '': data };
		this.#refCountMap.set(this.#data, 1);

		this.#status = { type: resultType };
	};

	// Not used and the applyChange method is depricated
	// #applyChange(change: Change): void {
	// 	applyChange(
	// 		this.#data,
	// 		change,
	// 		(this.query as any).schema,
	// 		'',
	// 		this.query.format,
	// 		this.#refCountMap
	// 	);
	// }

	#materializeIfNeeded() {
		if (!this.#view) {
			this.#view = this.zero.current.materialize(this.query);
			this.onMaterialized(this);
		}
	}

	// Used in Svelte components
	get current(): QueryResult<TReturn> {
		// This triggers the subscription tracking
		this.#subscribe();
		const data = this.#data[''];
		return [data as HumanReadable<TReturn>, this.#status];
	}
}

class ViewStore {
	// eslint-disable-next-line
	#views = new Map<string, ViewWrapper<any, any, any>>();

	getView<TSchema extends Schema, TTable extends keyof TSchema['tables'] & string, TReturn>(
		clientID: string,
		zero: Z<TSchema>,
		query: QueryDef<TSchema, TTable, TReturn>,
		enabled: boolean = true
	): ViewWrapper<TSchema, TTable, TReturn> {
		if (!enabled) {
			return new ViewWrapper(
				zero,
				query,
				() => {},
				() => {}
			);
		}

		const hash = query.hash() + clientID;
		let existing = this.#views.get(hash);

		if (!existing) {
			existing = new ViewWrapper(
				zero,
				query,
				(view) => {
					const lastView = this.#views.get(hash);
					if (lastView && lastView !== view) {
						throw new Error('View already exists');
					}
					this.#views.set(hash, view);
				},
				() => this.#views.delete(hash)
			);
			this.#views.set(hash, existing);
		}

		return existing;
	}
}

export const viewStore = new ViewStore();

export class Query<
	TSchema extends Schema,
	TTable extends keyof TSchema['tables'] & string,
	TReturn
> {
	current = $state<HumanReadable<TReturn>>(null!);
	details = $state<QueryResultDetails>(null!);
	#query_impl: QueryDef<TSchema, TTable, TReturn>;
	#view: ViewWrapper<TSchema, TTable, TReturn> | undefined;

	constructor(query: QueryDef<TSchema, TTable, TReturn>, enabled: boolean = true) {
		const z = getContext('z') as Z<Schema>;
		const id = z?.current?.userID ? z?.current.userID : 'anon';
		this.#query_impl = query as unknown as QueryDef<TSchema, TTable, TReturn>;
		const default_snapshot = getDefaultSnapshot(this.#query_impl.format.singular);
		this.current = default_snapshot[0] as HumanReadable<TReturn>;
		this.details = default_snapshot[1];
		this.#view = viewStore.getView(id, this.#query_impl, enabled);
		this.current = this.#view.current[0];
		this.details = this.#view.current[1];

		// Watch for changes in the query
		$effect(() => {
			if (this.#view) {
				this.current = this.#view.current[0];
				this.details = this.#view.current[1];
			}
		});
	}

	// Method to update the query
	updateQuery(newQuery: QueryDef<TSchema, TTable, TReturn>, enabled: boolean = true) {
		const z = getContext('z') as Z<Schema>;
		const id = z?.current?.userID ? z?.current.userID : 'anon';
		this.#query_impl = newQuery as unknown as QueryDef<TSchema, TTable, TReturn>;
		this.#view = viewStore.getView(id, z, this.#query_impl, enabled);
		this.current = this.#view.current[0];
		this.details = this.#view.current[1];
	}
}
