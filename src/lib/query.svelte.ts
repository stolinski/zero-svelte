import { createSubscriber } from 'svelte/reactivity';
import type {
	Query as QueryDef,
	QueryType,
	ReadonlyJSONValue,
	Smash,
	TableSchema,
	TypedView
} from '@rocicorp/zero';
import { deepClone } from './shared/deep-clone';
import type { Immutable } from './shared/immutable';
import type { AdvancedQuery } from '@rocicorp/zero/advanced';
import { getContext } from 'svelte';
import type { Schema, Z } from './Z.svelte.js';

export type ResultType = 'unknown' | 'complete';

export type QueryResultDetails = {
	type: ResultType;
};

export type QueryResult<TReturn extends QueryType> = [Smash<TReturn>, QueryResultDetails];

const emptyArray: unknown[] = [];
const defaultSnapshots = {
	singular: [undefined, { type: 'unknown' }] as const,
	plural: [emptyArray, { type: 'unknown' }] as const
};

function getDefaultSnapshot<TReturn extends QueryType>(singular: boolean): QueryResult<TReturn> {
	return (singular ? defaultSnapshots.singular : defaultSnapshots.plural) as QueryResult<TReturn>;
}

class ViewWrapper<TSchema extends TableSchema, TReturn extends QueryType> {
	#view: TypedView<Smash<TReturn>> | undefined;
	#snapshot: QueryResult<TReturn>;
	#subscribe: () => void;

	constructor(
		private query: QueryDef<TSchema, TReturn>,
		private onMaterialized: (view: ViewWrapper<TSchema, TReturn>) => void,
		private onDematerialized: () => void
	) {
		this.#snapshot = getDefaultSnapshot(query.format.singular);

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

	#onData = (snap: Immutable<Smash<TReturn>>, resultType: ResultType, update: () => void) => {
		const data =
			snap === undefined ? snap : (deepClone(snap as ReadonlyJSONValue) as Smash<TReturn>);
		this.#snapshot = [data, { type: resultType }] as QueryResult<TReturn>;
		update(); // Notify Svelte that the data has changed
	};

	#materializeIfNeeded() {
		if (!this.#view) {
			this.#view = this.query.materialize();
			this.onMaterialized(this);
		}
	}

	// Used in Svelte components
	get current(): QueryResult<TReturn> {
		// This triggers the subscription tracking
		this.#subscribe();
		return this.#snapshot;
	}
}

class ViewStore {
	#views = new Map<string, ViewWrapper<any, any>>();

	getView<TSchema extends TableSchema, TReturn extends QueryType>(
		clientID: string,
		query: AdvancedQuery<TSchema, TReturn>,
		enabled: boolean = true
	): ViewWrapper<TSchema, TReturn> {
		if (!enabled) {
			return new ViewWrapper(
				query,
				() => {},
				() => {}
			);
		}

		const hash = query.hash() + clientID;
		let existing = this.#views.get(hash);

		if (!existing) {
			existing = new ViewWrapper(
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

export class Query<TSchema extends TableSchema, TReturn extends QueryType> {
	current = $state<Smash<TReturn>>(null!);
	details = $state<QueryResultDetails>(null!);
	#query_impl: AdvancedQuery<TSchema, TReturn>;

	constructor(query: QueryDef<TSchema, TReturn>, enabled: boolean = true) {
		const z = getContext('z') as Z<Schema>;
		const id = z?.current?.userID ? z?.current.userID : 'anon';
		this.#query_impl = query as unknown as AdvancedQuery<TSchema, TReturn>;
		const default_snapshot = getDefaultSnapshot(this.#query_impl.format.singular);
		this.current = default_snapshot[0] as Smash<TReturn>;
		this.details = default_snapshot[1];
		const view = viewStore.getView(id, this.#query_impl, enabled);
		this.current = view.current[0];
		this.details = view.current[1];
		$effect(() => {
			this.current = view.current[0];
			this.details = view.current[1];
		});
	}
}
