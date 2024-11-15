// NOTE:
// You need your db to exist that matches this schema.
// I  don't have migration code in this repo, feel free to add

import { PUBLIC_SERVER } from '$env/static/public';
import { Zero } from '@rocicorp/zero';

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

const schema = {
	version: 1,
	tables: {
		todo: todoSchema
	}
} as const;

export const z = new Zero({
	// Documentation on auth coming soon.
	userID: 'anon',
	server: PUBLIC_SERVER,
	schema
	// This is easier to develop with until we make the persistent state
	// delete itself on schema changes. Just remove to get persistent storage.
	// kvStore: 'mem'
});
