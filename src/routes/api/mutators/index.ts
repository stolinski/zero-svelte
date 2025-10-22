import type { CustomMutatorDefs, Transaction } from '@rocicorp/zero';
import type { Schema } from '../../../schema.js';

export function createMutators() {
	return {
		type: {
			create: async (tx: Transaction<Schema>, { id, name }: { id: string; name: string }) => {
				if (name.length > 100) throw new Error(`Name is too long`);
				await tx.mutate.type.insert({ id, name });
			},

			update: async (tx: Transaction<Schema>, { id, name }: { id: string; name: string }) => {
				if (name.length > 100) throw new Error(`Name is too long`);
				await tx.mutate.type.update({ id, name });
			},

			delete: async (tx: Transaction<Schema>, id: string) => {
				await tx.mutate.type.delete({ id });
			}
		},
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
				// Validate title length. Legacy issues are exempt.
				if (title.length > 100) throw new Error(`Title is too long`);

				await tx.mutate.todo.insert({ id, title, completed, type_id });
			},

			update: async (
				tx: Transaction<Schema>,
				{
					id,
					title,
					completed,
					type_id
				}: { id: string; type_id: string; completed: boolean; title: string }
			) => {
				// Validate title length. Legacy issues are exempt.
				if (title.length > 100) throw new Error(`Title is too long`);

				await tx.mutate.todo.update({ id, title, completed, type_id });
			},

			delete: async (tx: Transaction<Schema>, id: string) => {
				await tx.mutate.todo.delete({ id });
			},

			toggle_complete: async (tx: Transaction<Schema>, id: string) => {
				const currentTodo = await tx.query.todo.where('id', id).one();
				const completed = !currentTodo?.completed;
				await tx.mutate.todo.update({ id, completed });
			}
		}
	} as const satisfies CustomMutatorDefs;
}

export type CreateMutators = ReturnType<typeof createMutators>;