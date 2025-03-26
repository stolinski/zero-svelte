import { pgTable, boolean, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const types = pgTable('type', {
	id: varchar('id').primaryKey(),
	name: varchar('name').notNull()
});

export const todos = pgTable('todo', {
	id: varchar('id').primaryKey(),
	title: varchar('title').notNull(),
	completed: boolean('completed').notNull().default(false),
	type_id: varchar('type_id').references(() => types.id)
});

export const todosRelations = relations(todos, ({ one }) => ({
	type: one(types, {
		fields: [todos.type_id],
		references: [types.id]
	})
}));
