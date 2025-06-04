import { Zero, type Schema, type ZeroOptions, type CustomMutatorDefs } from '@rocicorp/zero';

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<
	TSchema extends Schema,
	MD extends CustomMutatorDefs<TSchema> | undefined = undefined
> {
	current: Zero<TSchema, MD> = $state(null!);

	constructor(z_options: ZeroOptions<TSchema, MD>) {
		this.build(z_options);
	}

	build(z_options: ZeroOptions<TSchema, MD>) {
		// Create new Zero instance
		this.current = new Zero(z_options);
	}

	close() {
		this.current.close();
	}
}
