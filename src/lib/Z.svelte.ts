import { Zero, type Schema, type ZeroOptions, type CustomMutatorDefs } from '@rocicorp/zero';
import { setContext } from 'svelte';

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<TSchema extends Schema, MD extends CustomMutatorDefs | undefined = undefined> {
	current: Zero<TSchema, MD> = $state(null!);

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

	build(z_options: ZeroOptions<TSchema, MD>) {
		// Create new Zero instance
		this.current = new Zero(z_options);
	}

	close() {
		this.current.close();
	}
}
