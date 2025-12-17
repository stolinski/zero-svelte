import {
	Zero,
	type CustomMutatorDefs,
	type DefaultSchema,
	type Entry,
	type HumanReadable,
	type Query as QueryDef,
	type RunOptions,
	type Schema,
	type TTL,
	type TypedView,
	type ZeroOptions
} from '@rocicorp/zero';
import { asQueryInternals } from '@rocicorp/zero/bindings';
import { untrack } from 'svelte';
import { createSubscriber, SvelteMap } from 'svelte/reactivity';
import { Query } from './query.svelte.js';
import type { QueryResultDetails, ResultType } from './types.js';

export class ViewStore {
	#views = new SvelteMap<string, unknown>();

	getView<
		TTable extends keyof TSchema['tables'] & string,
		TSchema extends Schema,
		TReturn,
		MD extends CustomMutatorDefs | undefined = undefined
	>(
		z: Z<TSchema, MD>,
		query: QueryDef<TTable, TSchema, TReturn>,
		enabled: boolean = true
	): ViewWrapper<TTable, TSchema, TReturn, MD> {
		if (!enabled) {
			return new ViewWrapper(
				z,
				query,
				() => {},
				() => {},
				false
			);
		}

		const hash = asQueryInternals(query).hash();

		// Use untrack to prevent state mutations from being tracked during $derived
		return untrack(() => {
			let existing = this.#views.get(hash) as ViewWrapper<TTable, TSchema, TReturn, MD> | undefined;

			if (!existing) {
				existing = new ViewWrapper(
					z,
					query,
					(view) => {
						const lastView = this.#views.get(hash);
						if (lastView && lastView !== view) {
							throw new Error('View already exists');
						}
						this.#views.set(hash, view);
					},
					() => this.#views.delete(hash),
					true
				);
				this.#views.set(hash, existing);
			}

			return existing;
		});
	}
}

export class ViewWrapper<
	TTable extends keyof TSchema['tables'] & string,
	TSchema extends Schema,
	TReturn,
	MD extends CustomMutatorDefs | undefined = undefined
> {
	#view: TypedView<HumanReadable<TReturn>> | undefined;
	#data = $state<Entry>({ '': undefined });
	#status = $state<QueryResultDetails>({ type: 'unknown' });
	#subscribe: () => void;
	readonly #refCountMap = new WeakMap<Entry, number>();

	constructor(
		private z: Z<TSchema, MD>,
		private query: QueryDef<TTable, TSchema, TReturn>,
		private onMaterialized: (view: ViewWrapper<TTable, TSchema, TReturn, MD>) => void,
		private onDematerialized: () => void,
		private enabled: boolean
	) {
		// Initialize the data based on format
		const internals = asQueryInternals(this.query);
		this.#data = { '': internals.format.singular ? undefined : [] };

		// Create a subscriber that manages view life-cycle
		this.#subscribe = createSubscriber((notify) => {
			this.#materializeIfNeeded();

			let removeListener: (() => void) | undefined;
			if (this.#view) {
				// Listen for updates from the underlying TypedView and notify Svelte
				removeListener = this.#view.addListener((snap, resultType) => {
					this.#onData(snap as unknown as HumanReadable<TReturn> | undefined, resultType);
					notify();
				});
			}

			// Return cleanup function that will only be called
			// when all effects are destroyed
			return () => {
				removeListener?.();
				this.#view?.destroy();
				this.#view = undefined;
				this.onDematerialized();
			};
		});
	}

	#onData = (
		snap: HumanReadable<TReturn> | undefined,
		resultType: ResultType
		// update: () => void // not used??
	) => {
		// Clear old references
		this.#refCountMap.delete(this.#data);

		// Update data and track new references; snapshots from Zero are immutable
		this.#data = { '': snap as HumanReadable<TReturn> };
		this.#refCountMap.set(this.#data, 1);

		this.#status = { type: resultType };
	};

	#materializeIfNeeded() {
		if (!this.enabled) return;
		if (!this.#view) {
			this.#view = this.z.materialize(this.query);
			this.onMaterialized(this);
		}
	}

	// Used in Svelte components and Query class
	get current(): readonly [HumanReadable<TReturn>, QueryResultDetails] {
		// This triggers the subscription tracking
		this.#subscribe();
		const data = this.#data[''];
		return [data as HumanReadable<TReturn>, this.#status];
	}

	// Access data without triggering subscription (reads $state only)
	get dataOnly(): HumanReadable<TReturn> {
		return this.#data[''] as HumanReadable<TReturn>;
	}

	get detailsOnly(): QueryResultDetails {
		return this.#status;
	}

	// Manually ensure subscription is active
	ensureSubscribed(): void {
		this.#subscribe();
	}
}

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<
	TSchema extends Schema = DefaultSchema,
	MD extends CustomMutatorDefs | undefined = undefined
> {
	#zero = $state<Zero<TSchema, MD>>(null!);
	#online = $state(true);
	#onlineUnsubscribe?: () => void;
	#viewStore = new ViewStore();

	constructor(z_options: ZeroOptions<TSchema, MD>) {
		this.build(z_options);
	}

	// Reactive getter that proxy to internal Zero instance
	get query(): Zero<TSchema, MD>['query'] {
		return this.#zero.query;
	}

	get mutate(): Zero<TSchema, MD>['mutate'] {
		return this.#zero.mutate;
	}

	get mutateBatch(): Zero<TSchema, MD>['mutateBatch'] {
		return this.#zero.mutateBatch;
	}

	get clientID(): string {
		return this.#zero.clientID;
	}

	get userID(): string {
		return this.#zero.userID;
	}

	get online(): boolean {
		return this.#online;
	}

	get viewStore(): ViewStore {
		return this.#viewStore;
	}

	createQuery<TTable extends keyof TSchema['tables'] & string, TReturn>(
		query: QueryDef<TTable, TSchema, TReturn>,
		enabled: boolean = true
	): Query<TTable, TSchema, TReturn, MD> {
		return new Query(query, this, enabled);
	}

	// Alias for createQuery - shorter syntax
	q<TTable extends keyof TSchema['tables'] & string, TReturn>(
		query: QueryDef<TTable, TSchema, TReturn>,
		enabled: boolean = true
	): Query<TTable, TSchema, TReturn, MD> {
		return this.createQuery(query, enabled);
	}

	preload<TTable extends keyof TSchema['tables'] & string>(
		query: QueryDef<TTable, TSchema, unknown>,
		options?:
			| {
					/**
					 * Time To Live. This is the amount of time to keep the rows associated with
					 * this query after {@linkcode cleanup} has been called.
					 */
					ttl?: TTL | undefined;
			  }
			| undefined
	): { cleanup: () => void; complete: Promise<void> } {
		return this.#zero.preload(query, options);
	}

	run<TTable extends keyof TSchema['tables'] & string, TReturn>(
		query: QueryDef<TTable, TSchema, TReturn>,
		runOptions?: RunOptions | undefined
	) {
		return this.#zero.run(query, runOptions);
	}

	materialize<TTable extends keyof TSchema['tables'] & string, TReturn>(
		query: QueryDef<TTable, TSchema, TReturn>
	): TypedView<HumanReadable<TReturn>> {
		return this.#zero.materialize(query);
	}

	/**
	 * @deprecated Use direct accessors or methods instead. ie z.query, z.mutate, z.build
	 */
	get current(): Zero<TSchema, MD> {
		return this.#zero;
	}

	build(z_options: ZeroOptions<TSchema, MD>) {
		// Clean up previous subscription if it exists
		this.#onlineUnsubscribe?.();
		// Create new Zero instance
		this.#zero = new Zero(z_options);

		// Subscribe to online status changes
		this.#onlineUnsubscribe = this.#zero.onOnline((online) => {
			this.#online = online;
		});
	}

	close() {
		this.#onlineUnsubscribe?.();
		this.#zero.close();
	}
}
