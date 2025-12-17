import { ZERO_UPSTREAM_DB } from '$env/static/private';
import { mustGetMutator } from '@rocicorp/zero';
import { handleMutateRequest } from '@rocicorp/zero/server';
import { zeroNodePg } from '@rocicorp/zero/server/adapters/pg';
import { mutators } from '../../../mutators.js';
import { schema } from '../../../schema.js';

import type { RequestEvent } from '@sveltejs/kit';

// Create db provider using the Zero pg adapter
const dbProvider = zeroNodePg(schema, ZERO_UPSTREAM_DB);

export async function POST({ request }: RequestEvent) {
	const result = await handleMutateRequest(
		dbProvider,
		(transact) =>
			transact((tx, name, args) => {
				const mutator = mustGetMutator(mutators, name);
				return mutator.fn({
					args,
					tx,
					ctx: { userId: 'anon' }
				});
			}),
		request
	);

	return new Response(JSON.stringify(result));
}
