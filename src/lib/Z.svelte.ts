import { Zero, type ZeroOptions } from '@rocicorp/zero';
import { getContext, setContext } from 'svelte';

// This is the state of the Zero instance
// You can reset it on login or logout
export class ZCache {
	current: Zero = $state(null!);

	constructor(z_options: ZeroOptions) {
		this.build(z_options);
		setContext('z', this);
	}

	build(z_options: ZeroOptions) {
		// Create new Zero instance
		this.current = new Zero(z_options);
	}

	close() {
		this.current.close();
	}
}

export function get_cache() {
	return getContext<ZCache>('z');
}
