import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from '$lib/Z.svelte.js';
import { schema, type Schema } from '../schema.js';

export const z = new Z<Schema>({
	server: PUBLIC_SERVER,
	schema,
	userID: 'anon',
	kvStore: 'mem'
});
