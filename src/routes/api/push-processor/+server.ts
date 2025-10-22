import { ZERO_UPSTREAM_DB } from '$env/static/private';
import { PostgresJSConnection, PushProcessor, ZQLDatabase } from '@rocicorp/zero/pg';
import { json, type RequestHandler } from '@sveltejs/kit';
import postgres from 'postgres';
import { createMutators } from '../mutators/index.svelte.js';
import { schema } from '../../../schema.js';
import { createServerMutators } from '$lib/server/server-mutators.svete.js';


export const POST: RequestHandler = async ({ request, url, params, cookies }) => {
	const processor = new PushProcessor(
		new ZQLDatabase(new PostgresJSConnection(postgres(ZERO_UPSTREAM_DB)), schema)
	);

	// This is generally replaced with a JWT
	const fakeAuthData = {sub: '123456'}

	const result = await processor.process(createServerMutators(createMutators(fakeAuthData), fakeAuthData), request);

	return json(result);
};