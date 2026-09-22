import type {
	BaseDefaultSchema,
	CustomMutatorDefs,
	DefaultSchema,
	HumanReadable,
	Query as QueryDef,
	QueryOrQueryRequest
} from '@rocicorp/zero';
import { addContextToQuery } from '@rocicorp/zero/bindings';
import type { ViewWrapper, Z } from './Z.svelte.js';
import type { QueryResultDetails, ResultType } from './types.js';
export type { QueryResultDetails, ResultType };
export type QueryResult<TReturn> = readonly [HumanReadable<TReturn>, QueryResultDetails];

export class Query<
	TTable extends keyof TSchema['tables'] & string,
	TSchema extends BaseDefaultSchema = DefaultSchema,
	TReturn = unknown,
	MD extends CustomMutatorDefs | undefined = undefined
> {
	#resolveQuery = $state.raw<() => QueryDef<TTable, TSchema, TReturn>>(null!);
	#z: Z<TSchema, MD>;
	#enabled = $state(true);
	#view = $derived.by(() =>
		this.#z.viewStore.getView(this.#z, this.#resolveQuery(), this.#enabled)
	);
	#cleanup?: () => void;
	#destroyed = false;

	constructor(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query: QueryOrQueryRequest<TTable, any, any, TSchema, TReturn, any>,
		z: Z<TSchema, MD>,
		enabled: boolean = true
	) {
		this.#z = z;
		this.updateQuery(query, enabled);

		try {
			// Owned effects are disposed on component unmount AND derived replacement.
			// Keep the inner root explicitly disposable for Query.destroy().
			$effect(() => this.#start());
		} catch (error) {
			// Svelte 5.15 has no public effect-owner check. Preserve standalone queries
			// (e.g. created in event handlers), whose lifetime is managed by destroy().
			if (
				!(error instanceof Error) ||
				!/^(?:https:\/\/svelte\.dev\/e\/)?effect_(?:orphan|in_unowned_derived)(?:\n|$)/.test(
					error.message
				)
			) {
				throw error;
			}
			this.#start();
		}
	}

	#start(): (() => void) | undefined {
		if (this.#destroyed) return;
		this.#cleanup = $effect.root(() => {
			$effect(() => {
				// Subscribe even when data isn't read: background queries are supported.
				void this.#view.current;
			});
		});
		return () => this.destroy();
	}

	get data(): HumanReadable<TReturn> {
		return this.#view.dataOnly;
	}

	get details(): QueryResultDetails {
		return this.#view.detailsOnly;
	}

	get view(): ViewWrapper<TTable, TSchema, TReturn, MD> {
		return this.#view;
	}

	/** @deprecated Use .data instead */
	get current(): HumanReadable<TReturn> {
		return this.data;
	}

	updateQuery(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		newQuery: QueryOrQueryRequest<any, any, any, TSchema, TReturn, any>,
		enabled: boolean = true
	): void {
		// Validate synchronously, as before, but retain requests for auth rebuilds.
		const resolved = addContextToQuery(newQuery, this.#z.context) as QueryDef<
			TTable,
			TSchema,
			TReturn
		>;
		const clientID = this.#z.clientID;
		this.#resolveQuery = () =>
			this.#z.clientID === clientID
				? resolved
				: (addContextToQuery(newQuery, this.#z.context) as QueryDef<TTable, TSchema, TReturn>);
		this.#enabled = enabled;
	}

	destroy(): void {
		if (this.#destroyed) return;
		this.#destroyed = true;
		this.#cleanup?.();
		this.#cleanup = undefined;
	}
}
