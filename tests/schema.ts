import {
	createBuilder,
	createSchema,
	defineMutator,
	defineMutators,
	defineQueries,
	defineQuery,
	relationships,
	string,
	table
} from '@rocicorp/zero';

const todo = table('todo')
	.columns({ id: string(), title: string(), owner: string() })
	.primaryKey('id');

export const schema = createSchema({
	tables: [todo],
	relationships: [
		relationships(todo, ({ many }) => ({
			siblings: many({ sourceField: ['owner'], destField: ['owner'], destSchema: todo })
		}))
	],
	enableLegacyMutators: true
});

export const mutators = defineMutators({
	insert: defineMutator<{ id: string; title: string; owner: string }>(async ({ tx, args }) => {
		await tx.mutate.todo.insert(args);
	})
});

export const zql = createBuilder(schema);
export const queries = defineQueries({
	all: defineQuery(() => zql.todo),
	mine: defineQuery(({ ctx }: { ctx: { userID: string } }) => zql.todo.where('owner', ctx.userID))
});
