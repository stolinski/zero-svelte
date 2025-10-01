import {
	Zero,
	type Schema,
	type ZeroOptions,
	type CustomMutatorDefs,
	type Query as QueryDef
} from '@rocicorp/zero';
import { setContext } from 'svelte';

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<TSchema extends Schema, MD extends CustomMutatorDefs | undefined = undefined> {
	#zero = $state<Zero<TSchema, MD>>(null!);

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
	get query() {
		return this.#zero.query;
	}

	get mutate() {
		return this.#zero.mutate;
	}

	get clientID() {
		return this.#zero.clientID;
	}

	get userID() {
		return this.#zero.userID;
	}

	materialize<TTable extends keyof TSchema['tables'] & string, TReturn>(
		query: QueryDef<TSchema, TTable, TReturn>
	) {
		return this.#zero.materialize(query);
	}

	// Backward compatibility - keep .current working
	get current() {
		return this.#zero;
	}

	build(z_options: ZeroOptions<TSchema, MD>) {
		// Create new Zero instance
		this.#zero = new Zero(z_options);
	}

	close() {
		this.#zero.close();
	}
}
