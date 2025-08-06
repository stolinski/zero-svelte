import { Zero, type CustomMutatorDefs, type Schema, type ZeroOptions } from '@rocicorp/zero';

// This is the state of the Zero instance
// You can reset it on login or logout
export class Z<
	TSchema extends Schema,
	MD extends CustomMutatorDefs<TSchema> | undefined = undefined
> {
	current: Zero<TSchema, MD> = $state(null!);
	online = $state<boolean>();
	#onlineUnsubscribe: (() => void) | undefined;

	constructor(z_options: ZeroOptions<TSchema, MD>) {
		this.build(z_options);
	}

	build(z_options: ZeroOptions<TSchema, MD>) {
		// Clean up previous subscription if it exists
		this.#onlineUnsubscribe?.();

		// Create new Zero instance
		this.current = new Zero(z_options);

		// Initialize online status
		this.online = true;

		// Subscribe to online status changes
		this.#onlineUnsubscribe = this.current.onOnline((online) => {
			this.online = online;
		});
	}

	close() {
		this.#onlineUnsubscribe?.();
		this.current.close();
	}
}
