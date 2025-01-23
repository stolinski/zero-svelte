// NOTE:
// You need your db to exist that matches this schema.
// I  don't have migration code in this repo, feel free to add

import { createSchema, createTableSchema } from '@rocicorp/zero';

const typeSchema = createTableSchema({
	tableName: 'type',
	columns: {
		id: { type: 'string' },
		name: { type: 'string' }
	},
	primaryKey: ['id']
});

const todoSchema = createTableSchema({
	tableName: 'todo',
	columns: {
		id: { type: 'string' },
		title: { type: 'string' },
		completed: { type: 'boolean' },
		type_id: { type: 'string' }
	},
	primaryKey: ['id'],
	relationships: {
		type: {
			sourceField: 'id',
			destSchema: () => typeSchema,
			destField: 'type'
		}
	}
});

export const schema = createSchema({
	version: 1,
	tables: {
		todo: todoSchema,
		type: typeSchema
	}
});

export type Schema = typeof schema;
