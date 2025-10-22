import { withValidation, type ReadonlyJSONValue } from '@rocicorp/zero';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import type { RequestEvent } from '@sveltejs/kit';
import { schema } from '../../../schema.js';
import { queries } from '../queries/index.js';

export async function POST({ request }: RequestEvent) {
	const q = await handleGetQueriesRequest(getQuery, schema, request);

	return new Response(JSON.stringify(q));
}

// Build a map of queries with validation by name.
const validated = Object.fromEntries(
	Object.values(queries).map((q) => [q.queryName, withValidation(q)])
);

function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
	const q = validated[name];
	if (!q) {
		throw new Error(`No such query: ${name}`);
	}
	return {
		// First param is the context for contextful queries.
		// `args` are validated using the `parser` you provided with
		// the query definition.
		query: q(undefined, ...args)
	};
}
