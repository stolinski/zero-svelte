import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from '$lib/Z.svelte.js';
import { schema, type Schema } from '../schema.js';
import { createMutators, type CreateMutators } from './api/mutators/index.svelte.js';

// You will probably need to add these to your .env
// ZERO_GET_QUERIES_URL="http://localhost:9370/api/get-queries"
// ZERO_MUTATE_URL="http://localhost:9370/api/mutators"
// ZERO_PUSH_URL="http://localhost:9370/api/push-processor"

const authData = {sub: "123456"}


export const z = new Z<Schema, CreateMutators>({
	server: PUBLIC_SERVER,
	schema,
	userID: 'anon',
	kvStore: 'mem',
	mutators: createMutators(authData)
});
