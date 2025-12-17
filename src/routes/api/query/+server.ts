import { mustGetQuery } from '@rocicorp/zero';
import { handleQueryRequest } from '@rocicorp/zero/server';
import { queries, schema } from '../../../schema.js';

import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
	const result = await handleQueryRequest(
		(name, args) => {
			const query = mustGetQuery(queries, name);
			// Pass args and context (ctx) to the query function
			return query.fn({ args, ctx: {} });
		},
		schema,
		request
	);

	return new Response(JSON.stringify(result));
}
