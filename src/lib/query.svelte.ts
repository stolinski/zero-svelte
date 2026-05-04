import type {
	BaseDefaultContext,
	BaseDefaultSchema,
	CustomMutatorDefs,
	DefaultContext,
	DefaultSchema,
	HumanReadable,
	Query as QueryDef,
	QueryOrQueryRequest
} from '@rocicorp/zero';
import { addContextToQuery, asQueryInternals } from '@rocicorp/zero/bindings';
import type { ViewWrapper, Z } from './Z.svelte.js';
import type { QueryResultDetails, ResultType } from './types.js';
export type { QueryResultDetails, ResultType };
export type QueryResult<TReturn> = readonly [HumanReadable<TReturn>, QueryResultDetails];

export class Query<
	TTable extends keyof TSchema['tables'] & string,
	TSchema extends BaseDefaultSchema = DefaultSchema,
	TReturn = unknown,
	MD extends CustomMutatorDefs | undefined = undefined,
	TContext extends BaseDefaultContext = DefaultContext
> {
	#query_impl: QueryDef<TTable, TSchema, TReturn>;
	#z: Z<TSchema, MD, TContext>;
	#view = $state<ViewWrapper<TTable, TSchema, TReturn, MD, TContext> | undefined>();
	#cleanup?: () => void;

	constructor(
		query: QueryDef<TTable, TSchema, TReturn>,
		z: Z<TSchema, MD, TContext>,
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

	// Method to update the query - accepts both Query and QueryRequest
	updateQuery(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		newQuery: QueryOrQueryRequest<any, any, any, TSchema, TReturn, TContext>,
		enabled: boolean = true
	) {
		this.#query_impl = addContextToQuery(newQuery, this.#z.context) as QueryDef<
			TTable,
			TSchema,
			TReturn
		>;
		this.#view = this.#z.viewStore.getView(this.#z, this.#query_impl, enabled);
		// Setting #view (a $state) will trigger reactivity in components reading .data/.details
	}

	// Cleanup method to destroy the persistent effect
	destroy() {
		this.#cleanup?.();
	}
}
