import { createBuilder, syncedQuery } from '@rocicorp/zero';
import zod from 'zod';
import { schema } from '../../../schema.js';

export const builder = createBuilder(schema);

export const queries = {
	allTypes: syncedQuery('allTypes', zod.tuple([]), () => {
		return builder.type.orderBy('name', 'asc');
	}),
	allTodos: syncedQuery('allTodos', zod.tuple([]), () => {
		return builder.todo.related('type');
	}),
	getTodo: syncedQuery('getTodo', zod.tuple([zod.string().default('0')]), (id: string = '0') => {
		return builder.todo.where('id', id).related('type').one();
	}),
	getType: syncedQuery('getType', zod.tuple([zod.string()]), (id: string) => {
		return builder.type.where('id', id).one();
	})
};