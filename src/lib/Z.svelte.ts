import { Zero, type TableSchema, type ZeroOptions } from '@rocicorp/zero';

export type Schema = {
	readonly version: number;
	readonly tables: { readonly [table: string]: TableSchema };
};

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<TSchema extends Schema> {
	current: Zero<TSchema> = $state(null!);

	constructor(z_options: ZeroOptions<TSchema>) {
		this.build(z_options);
	}

	build(z_options: ZeroOptions<TSchema>) {
		// Create new Zero instance
		this.current = new Zero(z_options);
	}

	close() {
		this.current.close();
	}
}
