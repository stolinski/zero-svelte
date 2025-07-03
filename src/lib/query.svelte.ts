import type {
	Entry,
	HumanReadable,
	Query as QueryDef,
	ReadonlyJSONValue,
	Schema,
	TTL,
	TypedView
} from '@rocicorp/zero';
import { getContext } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';

// Not sure why, TS doesn't really want to allow the import using @rocicorp/zero directly
// this should end up as './shared/immutable.js
import type { Immutable } from '../../node_modules/@rocicorp/zero/out/shared/src/immutable.d.ts';
import type { Z } from './Z.svelte.js';

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
	#ttl: TTL | undefined;

	constructor(
		private query: QueryDef<TSchema, TTable, TReturn>,
		ttl: TTL | undefined,
		private onMaterialized: (view: ViewWrapper<TSchema, TTable, TReturn>) => void,
		private onDematerialized: () => void
	) {
		this.#ttl = ttl;

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
		_update: () => void
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

	#materializeIfNeeded() {
		if (!this.#view) {
			this.#view = this.query.materialize(this.#ttl);
			this.onMaterialized(this);
		}
	}

	updateTTL(ttl: TTL): void {
		this.#ttl = ttl;
		this.#view?.updateTTL(ttl);
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
		query: QueryDef<TSchema, TTable, TReturn>,
		ttl: TTL | undefined = undefined,
		enabled: boolean = true
	): ViewWrapper<TSchema, TTable, TReturn> {
		if (!enabled) {
			return new ViewWrapper(
				query,
				ttl,
				() => {},
				() => {}
			);
		}

		const hash = query.hash() + clientID;
		let existing = this.#views.get(hash);

		if (!existing) {
			existing = new ViewWrapper(
				query,
				ttl,
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
		} else {
			// Update TTL on existing view
			if (ttl !== undefined) {
				existing.updateTTL(ttl);
			}
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
	#ttl: TTL | undefined;

	constructor(
		query: QueryDef<TSchema, TTable, TReturn>,
		options: { enabled?: boolean; ttl?: TTL } = {}
	) {
		const { enabled = true, ttl } = options;
		const z = getContext('z') as Z<Schema>;
		const id = z?.current?.userID ? z?.current.userID : 'anon';
		this.#query_impl = query as unknown as QueryDef<TSchema, TTable, TReturn>;
		this.#ttl = ttl;
		const default_snapshot = getDefaultSnapshot(this.#query_impl.format.singular);
		this.current = default_snapshot[0] as HumanReadable<TReturn>;
		this.details = default_snapshot[1];
		this.#view = viewStore.getView(id, this.#query_impl, this.#ttl, enabled);
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
	updateQuery(
		newQuery: QueryDef<TSchema, TTable, TReturn>,
		options: { enabled?: boolean; ttl?: TTL } = {}
	) {
		const { enabled = true, ttl } = options;
		const z = getContext('z') as Z<Schema>;
		const id = z?.current?.userID ? z?.current.userID : 'anon';
		this.#query_impl = newQuery as unknown as QueryDef<TSchema, TTable, TReturn>;
		this.#ttl = ttl;
		this.#view = viewStore.getView(id, this.#query_impl, this.#ttl, enabled);
		this.current = this.#view.current[0];
		this.details = this.#view.current[1];
	}

	// Add updateTTL method to Query class
	updateTTL(ttl: TTL): void {
		this.#ttl = ttl;
		this.#view?.updateTTL(ttl);
	}
}
