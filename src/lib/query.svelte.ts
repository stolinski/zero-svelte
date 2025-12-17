import type {
	CustomMutatorDefs,
	DefaultSchema,
	HumanReadable,
	Query as QueryDef,
	Schema
} from '@rocicorp/zero';
import { asQueryInternals } from '@rocicorp/zero/bindings';
import type { ViewWrapper, Z } from './Z.svelte.js';
import type { QueryResultDetails, ResultType } from './types.js';
export type { QueryResultDetails, ResultType };
export type QueryResult<TReturn> = readonly [HumanReadable<TReturn>, QueryResultDetails];

export class Query<
	TTable extends keyof TSchema['tables'] & string,
	TSchema extends Schema = DefaultSchema,
	TReturn = unknown,
	MD extends CustomMutatorDefs | undefined = undefined
> {
	#query_impl: QueryDef<TTable, TSchema, TReturn>;
	#z: Z<TSchema, MD>;
	#view = $state<ViewWrapper<TTable, TSchema, TReturn, MD> | undefined>();
	#cleanup?: () => void;

	constructor(
		query: QueryDef<TTable, TSchema, TReturn>,
		z: Z<TSchema, MD>,
		enabled: boolean = true
	) {
		this.#z = z;
		this.#query_impl = query;
		this.#view = this.#z.viewStore.getView(this.#z, this.#query_impl, enabled);

		// Create a persistent effect that keeps the ViewWrapper subscription alive
		// This effect reads view.current which activates the subscription
		this.#cleanup = $effect.root(() => {
			$effect(() => {
				// Reading current activates and maintains the subscription
				void this.#view?.current;
			});
		});
	}

	get data() {
		const view = this.#view; // Read $state (tracks dependency on view changes)
		if (!view) {
			// Return default based on query format
			const internals = asQueryInternals(this.#query_impl);
			return (internals.format.singular ? undefined : []) as unknown as HumanReadable<TReturn>;
		}
		// Read state without re-triggering subscription (already activated in constructor)
		return view.dataOnly;
	}

	get details() {
		const view = this.#view; // Read $state (tracks dependency on view changes)
		if (!view) {
			return { type: 'unknown' } as QueryResultDetails;
		}
		// Read state without re-triggering subscription (already activated in constructor)
		return view.detailsOnly;
	}

	// Keep for backwards compatibility
	get view() {
		return this.#view;
	}

	// Deprecated accessor for backwards compatibility
	/** @deprecated Use .data instead */
	get current() {
		return this.data;
	}

	// Method to update the query
	updateQuery(newQuery: QueryDef<TTable, TSchema, TReturn>, enabled: boolean = true) {
		this.#query_impl = newQuery;
		this.#view = this.#z.viewStore.getView(this.#z, this.#query_impl, enabled);
		// Setting #view (a $state) will trigger reactivity in components reading .data/.details
	}

	// Cleanup method to destroy the persistent effect
	destroy() {
		this.#cleanup?.();
	}
}
