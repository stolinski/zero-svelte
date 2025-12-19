import {
	Zero,
	type Connection,
	type ConnectionState,
	type CustomMutatorDefs,
	type DefaultContext,
	type DefaultSchema,
	type Entry,
	type HumanReadable,
	type PullRow,
	type Query as QueryDef,
	type QueryOrQueryRequest,
	type ReadonlyJSONValue,
	type RunOptions,
	type Schema,
	type TTL,
	type TypedView,
	type ZeroOptions
} from '@rocicorp/zero';
import { addContextToQuery, asQueryInternals } from '@rocicorp/zero/bindings';
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
	#connectionState = $state<ConnectionState>({ name: 'connecting' });
	#connectionUnsubscribe?: () => void;
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

	// Add getter
	get context() {
		return this.#zero.context;
	}
	/**
	 * @deprecated Use `connectionState` instead for richer connection status information.
	 */
	get online(): boolean {
		return this.#connectionState.name === 'connected';
	}

	/**
	 * The current connection state. One of:
	 * - `connecting`: Actively trying to connect
	 * - `connected`: Successfully connected to the server
	 * - `disconnected`: Offline, will retry automatically
	 * - `needs-auth`: Authentication required, call `connection.connect()` with auth
	 * - `error`: Fatal error, call `connection.connect()` to retry
	 * - `closed`: Instance was closed, create a new Zero instance
	 */
	get connectionState(): ConnectionState {
		return this.#connectionState;
	}

	/**
	 * The connection API for managing Zero's connection lifecycle.
	 * Use this to manually control connections and handle auth failures.
	 *
	 * @example
	 * ```ts
	 * // Resume connection from error state
	 * await z.connection.connect();
	 *
	 * // Resume with new auth token
	 * await z.connection.connect({ auth: newToken });
	 * ```
	 */
	get connection(): Connection {
		return this.#zero.connection;
	}

	get viewStore(): ViewStore {
		return this.#viewStore;
	}

	createQuery<
		TTable extends keyof TSchema['tables'] & string,
		TInput extends ReadonlyJSONValue | undefined,
		TOutput extends ReadonlyJSONValue | undefined,
		TReturn = PullRow<TTable, TSchema>,
		TContext = DefaultContext
	>(
		query: QueryOrQueryRequest<TTable, TInput, TOutput, TSchema, TReturn, TContext>,
		enabled: boolean = true
	): Query<TTable, TSchema, TReturn, MD> {
		const resolved = addContextToQuery(query, this.context as TContext);
		return new Query(resolved, this, enabled);
	}

	// // Fix createQuery
	// createQuery(query, enabled = true) {
	//     const resolved = addContextToQuery(query, this.context);  // use this.context
	//     return new Query(resolved, this, enabled);
	// }

	// Alias for createQuery - shorter syntax
	q<
		TTable extends keyof TSchema['tables'] & string,
		TInput extends ReadonlyJSONValue | undefined,
		TOutput extends ReadonlyJSONValue | undefined,
		TReturn = PullRow<TTable, TSchema>,
		TContext = DefaultContext
	>(
		query: QueryOrQueryRequest<TTable, TInput, TOutput, TSchema, TReturn, TContext>,
		enabled: boolean = true
	): Query<TTable, TSchema, TReturn, MD> {
		return this.createQuery(query, enabled);
	}

	preload<
		TTable extends keyof TSchema['tables'] & string,
		TInput extends ReadonlyJSONValue | undefined,
		TOutput extends ReadonlyJSONValue | undefined,
		TReturn = PullRow<TTable, TSchema>,
		TContext = DefaultContext
	>(
		query: QueryOrQueryRequest<TTable, TInput, TOutput, TSchema, TReturn, TContext>,
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
		const resolved = addContextToQuery(query, this.context as TContext);
		return this.#zero.preload(resolved, options);
	}

	run<
		TTable extends keyof TSchema['tables'] & string,
		TInput extends ReadonlyJSONValue | undefined,
		TOutput extends ReadonlyJSONValue | undefined,
		TReturn = PullRow<TTable, TSchema>,
		TContext = DefaultContext
	>(
		query: QueryOrQueryRequest<TTable, TInput, TOutput, TSchema, TReturn, TContext>,
		runOptions?: RunOptions | undefined
	) {
		const resolved = addContextToQuery(query, this.context as TContext);
		return this.#zero.run(resolved, runOptions);
	}

	materialize<
		TTable extends keyof TSchema['tables'] & string,
		TInput extends ReadonlyJSONValue | undefined,
		TOutput extends ReadonlyJSONValue | undefined,
		TReturn = PullRow<TTable, TSchema>,
		TContext = DefaultContext
	>(
		query: QueryOrQueryRequest<TTable, TInput, TOutput, TSchema, TReturn, TContext>
	): TypedView<HumanReadable<TReturn>> {
		const resolved = addContextToQuery(query, this.context as TContext);
		return this.#zero.materialize(resolved);
	}

	/**
	 * @deprecated Use direct accessors or methods instead. ie z.query, z.mutate, z.build
	 */
	get current(): Zero<TSchema, MD> {
		return this.#zero;
	}

	build(z_options: ZeroOptions<TSchema, MD>) {
		// Clean up previous subscription if it exists
		this.#connectionUnsubscribe?.();

		// Create new Zero instance
		this.#zero = new Zero(z_options);

		// Subscribe to connection state changes
		this.#connectionUnsubscribe = this.#zero.connection.state.subscribe((state) => {
			this.#connectionState = state;
		});

		// Initialize connection state
		this.#connectionState = this.#zero.connection.state.current;
	}

	close() {
		this.#connectionUnsubscribe?.();
		this.#zero.close();
	}
}
