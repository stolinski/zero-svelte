import {
	defineQueries,
	defineQuery,
	type Connection,
	type ConnectionState,
	type Row
} from '@rocicorp/zero';
import { type } from 'arktype';
import { expectTypeOf } from 'vitest';
import { Query, Z, type QueryResultDetails } from 'zero-svelte';
import { z } from 'zod';
import { schema, zql } from './schema.js';

// Compile against the packaged entry point, with the same augmentation a consumer uses.
declare module '@rocicorp/zero' {
	interface DefaultTypes {
		schema: typeof schema;
		context: { userID: string };
	}
}

const client = new Z({ schema, userID: 'alice', context: { userID: 'alice' }, cacheURL: null });
const explicit = new Z<typeof schema>({ schema, context: { userID: 'alice' }, cacheURL: null });
const queries = defineQueries({
	all: defineQuery(() => zql.todo),
	one: defineQuery(type({ id: 'string' }), ({ args }) => zql.todo.where('id', args.id).one()),
	owner: defineQuery(z.object({ owner: z.string() }), ({ args }) =>
		zql.todo.where('owner', args.owner)
	),
	mine: defineQuery(({ ctx }) => zql.todo.where('owner', ctx.userID))
});

type Todo = Row<typeof schema.tables.todo>;
const list = client.createQuery(queries.all());
const one = client.q(queries.one({ id: '1' }));
expectTypeOf(list.data).toEqualTypeOf<Todo[]>();
expectTypeOf(one.data).toEqualTypeOf<Todo | undefined>();
expectTypeOf(client.q(zql.todo).data).toEqualTypeOf<Todo[]>();
expectTypeOf(explicit.q(queries.mine()).data).toEqualTypeOf<Todo[]>();
expectTypeOf(new Query(zql.todo, client).data).toEqualTypeOf<Todo[]>();
expectTypeOf(new Query(zql.todo.one(), client).data).toEqualTypeOf<Todo | undefined>();
expectTypeOf(client.q(queries.owner({ owner: 'alice' })).data).toEqualTypeOf<Todo[]>();
expectTypeOf(client.run(queries.all())).toEqualTypeOf<Promise<Todo[]>>();
expectTypeOf(client.q(zql.todo.related('siblings')).data[0].siblings).toEqualTypeOf<
	readonly Todo[]
>();
expectTypeOf(client.q(zql.todo.related('siblings', (q) => q.one())).data[0].siblings).toEqualTypeOf<
	Todo | undefined
>();
expectTypeOf(client.materialize(queries.one({ id: '1' })).data).toEqualTypeOf<Todo | undefined>();
expectTypeOf(client.preload(queries.all(), { ttl: '1m' }).complete).toEqualTypeOf<Promise<void>>();
expectTypeOf(list.details).toEqualTypeOf<QueryResultDetails>();
expectTypeOf(list.current).toEqualTypeOf(list.data);
expectTypeOf(client.connection).toEqualTypeOf<Connection>();
expectTypeOf(client.connectionState).toEqualTypeOf<ConnectionState>();
expectTypeOf(client.userID).toEqualTypeOf<string | undefined>();
expectTypeOf(client.online).toEqualTypeOf<boolean>();
list.updateQuery(queries.mine(), false);
list.destroy();

// Invalid consumer code must continue to be rejected, not silently widen to any.
// @ts-expect-error unknown column
client.q(zql.todo.where('missing', 'value'));
// @ts-expect-error invalid query input
queries.one({ id: 123 });
// @ts-expect-error missing query input
queries.one();
// @ts-expect-error singular results may be undefined
void one.data.id;
// @ts-expect-error rows do not have arbitrary properties
void list.data[0].missing;
