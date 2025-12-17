import { defineMutator, defineMutators } from '@rocicorp/zero';

export const mutators = defineMutators({
	todo: {
		insert: defineMutator<{
			id: string;
			title: string;
			completed: boolean;
			type_id: string;
		}>(async ({ tx, args: { id, title, completed, type_id } }) => {
			await tx.mutate.todo.insert({ id, title, completed, type_id });
		}),
		update: defineMutator<{
			id: string;
			completed?: boolean;
			title?: string;
		}>(async ({ tx, args: { id, completed, title } }) => {
			await tx.mutate.todo.update({ id, completed, title });
		}),
		delete: defineMutator<{ id: string }>(async ({ tx, args: { id } }) => {
			await tx.mutate.todo.delete({ id });
		})
	},
	type: {
		insert: defineMutator<{ id: string; name: string }>(async ({ tx, args: { id, name } }) => {
			await tx.mutate.type.insert({ id, name });
		})
	}
});
