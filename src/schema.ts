// NOTE:
// You need your db to exist that matches this schema.
// I don't have migration code in this repo, feel free to add

import {
	boolean,
	createBuilder,
	createSchema,
	defineQueries,
	defineQuery,
	relationships,
	string,
	table
} from '@rocicorp/zero';

const types = table('type')
	.columns({
		id: string(),
		name: string()
	})
	.primaryKey('id');

const todos = table('todo')
	.columns({
		id: string(),
		title: string(),
		completed: boolean(),
		type_id: string()
	})
	.primaryKey('id');

const todoRelationship = relationships(todos, ({ one }) => ({
	type: one({
		sourceField: ['type_id'],
		destField: ['id'],
		destSchema: types
	})
}));

export const schema = createSchema({
	tables: [types, todos],
	relationships: [todoRelationship]
});

export type Schema = typeof schema;

// Create a typed ZQL builder
export const zql = createBuilder(schema);

// Define queries using Zero 0.25 pattern
export const queries = defineQueries({
	todo: {
		all: defineQuery(() => zql.todo.related('type')),
		byTypeId: defineQuery<{ typeId: string }>(({ args: { typeId } }) =>
			zql.todo.where('type_id', '=', typeId).related('type')
		),
		byCompleted: defineQuery<{ completed: boolean }>(({ args: { completed } }) =>
			zql.todo.where('completed', '=', completed).related('type')
		)
	},
	type: {
		all: defineQuery(() => zql.type)
	}
});

// Register schema as default type for Zero
declare module '@rocicorp/zero' {
	interface DefaultTypes {
		schema: Schema;
	}
}
