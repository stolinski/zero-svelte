// NOTE:
// You need your db to exist that matches this schema.
// I  don't have migration code in this repo, feel free to add

import {
	ANYONE_CAN,
	boolean,
	createSchema,
	definePermissions,
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

export const schema = createSchema(1, {
	tables: [types, todos],
	relationships: [todoRelationship]
});

export type Schema = typeof schema;

type AuthData = {
	// The logged-in user.
	sub: string;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	return {
		issue: {
			row: {
				delete: ANYONE_CAN,
				insert: ANYONE_CAN
			}
		}
	};
});
