import {
	RunOptions,
	TTL,
	Zero,
	type CustomMutatorDefs,
	type HumanReadable,
	type Query as QueryDef,
	type Schema,
	type TypedView,
	type ZeroOptions
} from '@rocicorp/zero';
import { setContext } from 'svelte';

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<TSchema extends Schema, MD extends CustomMutatorDefs | undefined = undefined> {
	#zero = $state<Zero<TSchema, MD>>(null!);
	#online = $state(true);
	#onlineUnsubscribe?: () => void;

	constructor(z_options: ZeroOptions<TSchema, MD>) {
		this.build(z_options);

		try {
			setContext('z', this);
		} catch {
			console.error(
				'Unable to use `setContext`. Please make sure to call `new Z()` in a component or set the context yourself in a component like this:\n\n' +
					'import { setContext } from "svelte"\n' +
					'import { Z } from "zero-svelte"\n\n' +
					'const z = new Z<Schema>({})\nsetContext("z", z)'
			);
		}
	}

	// Reactive getters that proxy to internal Zero instance
	get query(): Zero<TSchema, MD>['query'] {
		return this.#zero.query;
	}

	get mutate(): Zero<TSchema, MD>['mutate'] {
		return this.#zero.mutate;
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

	preload<TTable extends keyof TSchema['tables'] & string>(
		query: QueryDef<TSchema, TTable, any>,
		options?: {
		/**
		 * Time To Live. This is the amount of time to keep the rows associated with
		 * this query after {@linkcode cleanup} has been called.
		 */
			ttl?: TTL | undefined;
		} | undefined
	): { cleanup: () => void; complete: Promise<void> } {
		return this.#zero.preload(query, options);
	}

	run<Q>(query: Q, runOptions?: RunOptions | undefined) {
		return this.#zero.run(query, runOptions);
	}

	materialize<TTable extends keyof TSchema['tables'] & string, TReturn>(
		query: QueryDef<TSchema, TTable, TReturn>
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
