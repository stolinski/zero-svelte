import { ZERO_UPSTREAM_DB } from '$env/static/private';
import { PostgresJSConnection, PushProcessor, ZQLDatabase } from '@rocicorp/zero/pg';
import { json, type RequestHandler } from '@sveltejs/kit';
import postgres from 'postgres';
import { createMutators } from '../mutators/index.js';
import { schema } from '../../../schema.js';


export const POST: RequestHandler = async ({ request, url, params }) => {
	const processor = new PushProcessor(
		new ZQLDatabase(new PostgresJSConnection(postgres(ZERO_UPSTREAM_DB)), schema)
	);

	const result = await processor.process(createMutators(), request);

	return json(result);
};