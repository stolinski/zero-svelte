import type { CustomMutatorDefs, Transaction } from '@rocicorp/zero';
import type { Schema } from '../../../schema.js';

export function createMutators(authData: {sub: string}) {
	// You do auth here and in the server-mutators
	return {
		// todo mutators
		todo: {
			create: async (
				tx: Transaction<Schema>,
				{
					id,
					title,
					completed,
					type_id
				}: { id: string; type_id: string; completed: boolean; title: string }
			) => {
				// You can do permissions work here
				if(!authData.sub) throw new Error(`Not Authorized`);
				// Validate title length. Legacy issues are exempt.
				if (title.length > 100) throw new Error(`Title is too long`);

				await tx.mutate.todo.insert({ id, title, completed, type_id });
			},

			edit: async (
				tx: Transaction<Schema>,
				{
					id,
					title,
					completed,
					type_id
				}: { id: string; type_id: string; completed: boolean; title: string }
			) => {
				if(!authData.sub) throw new Error(`Not Authorized`);
				if (title.length > 100) throw new Error(`Title is too long`);

				await tx.mutate.todo.update({ id, title, completed, type_id });
			},

			remove: async (tx: Transaction<Schema>, id: string) => {
				if(!authData.sub) throw new Error(`Not Authorized`);
				await tx.mutate.todo.delete({ id });
			},

			toggle_complete: async (tx: Transaction<Schema>, id: string) => {
				const currentTodo = await tx.query.todo.where('id', id).one();
				const completed = !currentTodo?.completed;
				await tx.mutate.todo.update({ id, completed });
			}
		},

		// type mutators
		type: {
			create: async (tx: Transaction<Schema>, { id, name }: { id: string; name: string }) => {
				// You can do permissions work here
				if(!authData.sub) throw new Error(`Not Authorized`);
				// Also do other validation
				if (name.length > 100) throw new Error(`Name is too long`);
				await tx.mutate.type.insert({ id, name });
			},

			edit: async (tx: Transaction<Schema>, { id, name }: { id: string; name: string }) => {
				if (name.length > 100) throw new Error(`Name is too long`);
				await tx.mutate.type.update({ id, name });
			},

			remove: async (tx: Transaction<Schema>, id: string) => {
				await tx.mutate.type.delete({ id });
			}
		},
	} as const satisfies CustomMutatorDefs;
}

export type CreateMutators = ReturnType<typeof createMutators>;