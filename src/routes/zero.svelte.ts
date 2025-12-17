import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from '$lib/Z.svelte.js';
import { mutators } from '../mutators.js';
import { schema } from '../schema.js';

export const z = new Z({
	cacheURL: PUBLIC_SERVER,
	schema,
	mutators,
	userID: 'anon',
	kvStore: 'mem'
});

// Re-export for convenience
export { mutators };
