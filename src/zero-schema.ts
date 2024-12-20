// NOTE:
// You need your db to exist that matches this schema.
// I  don't have migration code in this repo, feel free to add

const todoSchema = {
	tableName: 'todo',
	columns: {
		id: { type: 'string' },
		title: { type: 'string' },
		completed: { type: 'boolean' }
	},
	primaryKey: ['id'],
	relationships: {}
} as const;

export const schema = {
	version: 1,
	tables: {
		todo: todoSchema
	}
} as const;

export type Schema = typeof schema;
