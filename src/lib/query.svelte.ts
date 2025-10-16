import type { CustomMutatorDefs, HumanReadable, Query as QueryDef, Schema } from '@rocicorp/zero';
import type { ViewWrapper, Z } from './Z.svelte.js';
import type { QueryResultDetails, ResultType } from './types.js';
export type { QueryResultDetails, ResultType };
export type QueryResult<TReturn> = readonly [HumanReadable<TReturn>, QueryResultDetails];

const emptyArray: unknown[] = [];
const defaultSnapshots = {
	singular: [undefined, { type: 'unknown' }] as const,
	plural: [emptyArray, { type: 'unknown' }] as const
};

function getDefaultSnapshot<TReturn>(singular: boolean): QueryResult<TReturn> {
	return (singular ? defaultSnapshots.singular : defaultSnapshots.plural) as QueryResult<TReturn>;
}

export class Query<
	TSchema extends Schema,
	TTable extends keyof TSchema['tables'] & string,
	TReturn,
	MD extends CustomMutatorDefs | undefined = undefined
> {
	#query_impl: QueryDef<TSchema, TTable, TReturn>;
	#z: Z<TSchema, MD>;
	#data: HumanReadable<TReturn>;

	public details: QueryResultDetails;
	public view: ViewWrapper<TSchema, TTable, TReturn, MD> | undefined;

	constructor(
		query: QueryDef<TSchema, TTable, TReturn>,
		z: Z<TSchema, MD>,
		enabled: boolean = true
	) {
		this.#z = z;
		this.#query_impl = query as unknown as QueryDef<TSchema, TTable, TReturn>;
		const default_snapshot = getDefaultSnapshot(this.#query_impl.format.singular);
		this.#data = $state<HumanReadable<TReturn>>(default_snapshot[0] as HumanReadable<TReturn>);
		this.details = $state<QueryResultDetails>(default_snapshot[1]);
		this.view = $state<ViewWrapper<TSchema, TTable, TReturn, MD> | undefined>(
			this.#z.viewStore.getView(this.#z, this.#query_impl, enabled)
		);

		// Watch for changes in the query and (re)subscribe
		$effect(() => {
			const v = this.view;
			if (v) {
				const [data, details] = v.current;
				this.#data = data;
				this.details = details;
			}
		});
	}

	get data() {
		return this.#data;
	}

	// Deprecated accessor for backwards compatibility
	/** @deprecated Use .data instead */
	get current() {
		return this.#data;
	}

	// Method to update the query
	updateQuery(newQuery: QueryDef<TSchema, TTable, TReturn>, enabled: boolean = true) {
		this.#query_impl = newQuery as unknown as QueryDef<TSchema, TTable, TReturn>;
		this.view = this.#z.viewStore.getView(this.#z, this.#query_impl, enabled);
	}
}
