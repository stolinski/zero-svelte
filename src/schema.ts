// NOTE:
// You need your db to exist that matches this schema.
// I  don't have migration code in this repo, feel free to add
import { createZeroSchema } from 'drizzle-zero';
import {
	ANYONE_CAN,
	boolean,
	createSchema,
	definePermissions,
	relationships,
	string,
	table
} from '@rocicorp/zero';
import * as drizzle_schema from './db_schema.js';

export const schema = createZeroSchema(drizzle_schema, {
	version: 1,
	tables: {
		type: {
			id: true,
			name: true
		},
		todo: {
			id: true,
			title: true,
			completed: true,
			type_id: true
		}
	}
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
		},
		type: {
			row: {
				delete: ANYONE_CAN,
				insert: ANYONE_CAN
			}
		}
	};
});
