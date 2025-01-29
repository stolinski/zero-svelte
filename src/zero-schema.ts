// NOTE:
// You need your db to exist that matches this schema.
// I  don't have migration code in this repo, feel free to add
import {
	createSchema,
	relationships,
	table,
	string,
	boolean,
	definePermissions
} from '@rocicorp/zero';

const type = table('type')
	.columns({
		id: string(),
		name: string()
	})
	.primaryKey('id');

const todo = table('todo')
	.columns({
		id: string(),
		title: string(),
		completed: boolean(),
		type_id: string()
	})
	.primaryKey('id');

const todoRelationships = relationships(todo, ({ one }) => ({
	type: one({
		sourceField: ['type_id'],
		destSchema: type,
		destField: ['id']
	})
}));

export const schema = createSchema(1, {
	tables: [todo, type],
	relationships: [todoRelationships]
});

export type Schema = typeof schema;

export const permissions = definePermissions(schema, () => ({}));
