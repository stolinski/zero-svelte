import type { Row, Zero } from '@rocicorp/zero';
import { expectTypeOf } from 'vitest';
import { Query, Z } from 'zero-svelte';
import { schema, zql } from '../schema.js';

// This project deliberately does not register DefaultTypes.
const explicit = new Z<typeof schema>({ schema, cacheURL: null });
const inferred = new Z({ schema, cacheURL: null });
type Todo = Row<typeof schema.tables.todo>;

expectTypeOf(explicit.q(zql.todo).data).toEqualTypeOf<Todo[]>();
expectTypeOf(inferred.q(zql.todo.one()).data).toEqualTypeOf<Todo | undefined>();
expectTypeOf(new Query(zql.todo, explicit).data).toEqualTypeOf<Todo[]>();
expectTypeOf(explicit.context).toEqualTypeOf<unknown>();
expectTypeOf(explicit.mutate).toEqualTypeOf<Zero<typeof schema>['mutate']>();
expectTypeOf(explicit.query).toEqualTypeOf<Zero<typeof schema>['query']>();
