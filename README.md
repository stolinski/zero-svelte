# Zero Svelte

Zero is the local first platform for building incredible, super fast apps.

To use Zero Svelte, you need to follow the Zero docs to get started.

Watch this
[Zero Sync Makes Local First Easy](https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax)

[<img src="./zero1.png">](https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax)

## Usage

1. Follow [ZERO DOCS](https://zero.rocicorp.dev/docs/introduction) to get started with Zero
2. Install `npm install zero-svelte`
3. Usage

Create your Z instance.

`$lib/zero.svelte.ts`

```ts
import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from '$lib/Z.svelte.js';
import { schema, type Schema } from '../schema.js';

export const z = new Z<Schema>({
	server: PUBLIC_SERVER,
	schema,
	userID: 'anon',
	kvStore: 'mem'
});
```

Make sure your app has SSR turned off.

+layout.server.ts

```ts
export const ssr = false;
```

Use z in your app.

`+page.svelte (basic example)`

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';

	// Basic: always enabled; materializes immediately
	const todos = z.createQuery(z.query.todo);

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const id = randID();
		if (newTodo) {
			z.mutate.todo.insert({ id, title: newTodo, completed: false });
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.mutate.todo.update({ id, completed });
	}
</script>

<div>
	<h1>Todo</h1>
	<form {onsubmit}>
		<input type="text" id="newTodo" name="newTodo" />
		<button type="submit">Add</button>
	</form>
	<ul>
		{#each todos.data as todo}
			<li>
				<input
					type="checkbox"
					value={todo.id}
					checked={todo.completed}
					oninput={toggleTodo}
				/>{todo.title}
			</li>
		{/each}
	</ul>
</div>
```

+page.svelte (optional: enabled gating)

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
	// Gate materialization using the `enabled` flag.
	// When false, the query won't materialize or register listeners,
	// and `z` will be the default snapshot until re-enabled.
	let todosEnabled = $state(true);
	const todos = $derived.by(() => z.createQuery(z.query.todo, todosEnabled));

	const randID = () => Math.random().toString(36).slice(2);
	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const id = randID();
		if (newTodo) {
			z.mutate.todo.insert({ id, title: newTodo, completed: false });
			(event.target as HTMLFormElement).reset();
		}
	}
	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.mutate.todo.update({ id, completed });
	}
</script>

<div>
	<label>
		<input type="checkbox" bind:checked={todosEnabled} /> Enable todos query
	</label>
	<h1>Todo</h1>
	<form {onsubmit}>
		<input type="text" id="newTodo" name="newTodo" />
		<button type="submit">Add</button>
	</form>
	<ul>
		{#each todos.data as todo}
			<li>
				<input
					type="checkbox"
					value={todo.id}
					checked={todo.completed}
					oninput={toggleTodo}
				/>{todo.title}
			</li>
		{/each}
	</ul>
</div>
```

### +page.svelte (filtering with updateQuery and a stable Query)

Use a single `Query` instance and update it in response to user input. This avoids recreating queries on reactive changes and prevents double updates when options load.

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
	import { queries } from '$lib/schema.js'; // adjust path to your schema/queries

	let filtered_type: string | undefined = $state();

	// Create once
	const todos = z.createQuery(z.query.todo.related('type'));
	const types = z.createQuery(queries.allTypes());

	function applyFilter(value: string) {
		const ft = value || undefined;
		filtered_type = ft;
		const q = ft
			? z.query.todo.where('type_id', '=', ft).related('type')
			: z.query.todo.related('type');
		todos.updateQuery(q);
	}
</script>

<select
	name="todo_type"
	id="todo_type"
	onchange={(e) => applyFilter((e.target as HTMLSelectElement).value)}
>
	<option value="">All</option>
	{#each types.data as type (type.id)}
		<option value={type.id}>{type.name}</option>
	{/each}
</select>

<ul>
	{#each todos.data as todo (todo.id)}
		<li>{todo.title} - {todo.type?.name}</li>
	{/each}
</ul>
```

"todos" here is now reactive and will stay in sync with the persistent db and local data.

Mutations & queries are done with just standard Zero.

```javascript
z.mutate.todo.update({ id, completed });
```

Or this example which uses custom mutators and synced queries as suggested buy the zero team.

Create your Z instance.

`$lib/zero.svelte.ts`

```ts
import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from '$lib/Z.svelte.js';
import { schema, type Schema } from '../schema.js';
import { createMutators, type CreateMutators } from './api/mutators/index.svelte.js';

// You will probably need to add these to your .env
// ZERO_GET_QUERIES_URL="http://localhost:9370/api/get-queries"
// ZERO_MUTATE_URL="http://localhost:9370/api/mutators"
// ZERO_PUSH_URL="http://localhost:9370/api/push-processor"

const fake_auth_data = {sub: "123456"}

export const z = new Z<Schema, CreateMutators>({
	server: PUBLIC_SERVER,
	schema,
	userID: 'anon',
	kvStore: 'mem',
	mutators: createMutators(fake_auth_data )
});
```

Then you will need a mutators file

```ts
// /api/mutators/index.svelte
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
```

You need a get-queries file
```ts
// /api/get-queries/+serer.ts
import { withValidation, type ReadonlyJSONValue } from '@rocicorp/zero';
import { handleGetQueriesRequest } from '@rocicorp/zero/server';
import type { RequestEvent } from '@sveltejs/kit';
import { schema } from '../../../schema.js';
import { queries } from '../queries/index.svelte.js';

export async function POST({ request }: RequestEvent) {
	const q = await handleGetQueriesRequest(getQuery, schema, request);

	return new Response(JSON.stringify(q));
}

// Build a map of queries with validation by name.
const validated = Object.fromEntries(
	Object.values(queries).map((q) => [q.queryName, withValidation(q)])
);

function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
	const q = validated[name];
	if (!q) {
		throw new Error(`No such query: ${name}`);
	}
	return {
		// First param is the context for contextful queries.
		// `args` are validated using the `parser` you provided with
		// the query definition.
		query: q(undefined, ...args)
	};
}

```

And a queries file
```ts
// /api/queries/index..svelte.ts
import { createBuilder, syncedQuery } from '@rocicorp/zero';
import zod from 'zod';
import { schema } from '../../../schema.js';

// You can use runes in thi file
export const builder = createBuilder(schema);

export const queries = {
	allTypes: syncedQuery('allTypes', zod.tuple([]), () => {
		return builder.type.orderBy('name', 'asc');
	}),
	allTodos: syncedQuery('allTodos', zod.tuple([]), () => {
		return builder.todo.related('type');
	}),
	getTodo: syncedQuery('getTodo', zod.tuple([zod.string().default('0')]), (id: string = '0') => {
		return builder.todo.where('id', id).related('type').one();
	}),
	getType: syncedQuery('getType', zod.tuple([zod.string()]), (id: string) => {
		return builder.type.where('id', id).one();
	})
};
```

and this +page.svelte

```svelte
<script lang="ts">
	import { queries } from './api/queries/index.svelte.js';
	import './styles.css';
	import { z } from './zero.svelte.js';

	let show: 'ALL' | 'COMPLETED' = $state('ALL');
	let todo_dialog = $state<HTMLDialogElement>();
	let type_dialog = $state<HTMLDialogElement>();
	let current_todo = $state(z.q(queries.getTodo('0')));

	// BASIC QUERY
	// Stable Query instance; update when filter changes via event
	const todos = z.q(z.query.todo.related('type')); // Using q alias!

	function applyFilter(value: string) {
		const ft = value || undefined;
		const q = ft
			? z.query.todo.where('type_id', '=', ft).related('type')
			: z.query.todo.related('type');
		todos.updateQuery(q);
	}

	// BASIC QUERY + SYNCED QUERY API (soon to be deafult)
	const types = z.createQuery(queries.allTypes());

	const filtered_todos = $derived(
		z.createQuery(
			z.query.todo
				.where('completed', '=', show === ('COMPLETED' as 'COMPLETED' | 'ALL') ? true : false)
				.related('type')
		)
	);

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_name = formData.get('todo_name') as string;
		const todo_type = formData.get('todo_type') as string;
		const id = randID();
		if (todo_name) {
			// BASIC MUTATION // Using original zero "CRUD" mutator API
			z.mutate.todo.insert({ id, title: todo_name, completed: false, type_id: todo_type });
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggle_todo({ currentTarget }: { currentTarget: HTMLInputElement }) {
		// Custom mutator (/api/mutators)
		z.mutate.todo.toggle_complete(currentTarget.value);
	}

	function add_type(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_type = formData.get('type') as string;
		const id = randID();
		if (todo_type) {
			z.mutate.type.create({ id, name: todo_type });
			(event.target as HTMLFormElement).reset();
		}
	}

	function edit_todo(event: Event) {
		const formData = new FormData(event.target as HTMLFormElement);
		const id = formData.get('id') as string;
		const title = formData.get('title') as string;
		const completed = formData.get('completed') as string;
		const type_id = formData.get('type_id') as string;
		z.mutate.todo.edit({ id, title, type_id, completed: completed ? true : false });
		// original "CRUD" mutator API.
		// z.mutate.todo.update({ id, title, type_id, completed: completed ? true : false });
	}
	//
</script>

{#if z.online}
	<div>Connected</div>
{:else}
	<div>Offline</div>
{/if}

<div>
	<form onsubmit={add_type}>
		<input type="text" id="type" name="type" />
		<button type="submit">Add Type</button>
		<button type="button" onclick={() => type_dialog?.showModal()}> Edit Types </button>
	</form>
	<form {onsubmit}>
		<input type="text" id="todo_name" name="todo_name" />
		<select name="todo_type" id="todo_type">
			{#each types.data as type (type.id)}
				<option value={type.id}>{type.name}</option>
			{/each}
		</select>
		<button type="submit">Add</button>
	</form>
	<h1>Todos</h1>
	<label>
		Show Completed:
		<input
			type="checkbox"
			name="filter_option"
			value="incomplete"
			checked={show === 'COMPLETED'}
			onchange={() => {
				show = show === 'COMPLETED' ? 'ALL' : 'COMPLETED';
			}}
		/>
	</label>

	<select
		name="todo_type"
		onchange={(e) => {
			applyFilter(e.currentTarget.value);
		}}
	>
		<option value="">All</option>
		{#each types.data as type (type.id + 'option-list')}
			<option value={type.id}>{type.name}</option>
		{/each}
	</select>

	<ul>
		{#each todos.data as todo (todo.id)}
			<li>
				<input type="checkbox" value={todo.id} checked={todo.completed} oninput={toggle_todo} />
				{todo.title} - {todo.type?.name}
				<button
					class="ghost"
					onclick={() => {
						current_todo.updateQuery(queries.getTodo(todo.id));
						todo_dialog?.showModal();
					}}
				>
					✎
				</button>
				<button
					class="ghost"
					onclick={() => {
						z.mutate.todo.remove(todo.id);
					}}
				>
					X
				</button>
			</li>
		{/each}
	</ul>

	{#each filtered_todos.data as todo (todo.id + 'filtered')}
		<div>
			{todo.title} - {todo.type?.name} [{todo.completed ? 'Done' : 'Pending'}]
		</div>
	{/each}
</div>

<dialog id="type_dialog" bind:this={type_dialog}>
	<h2>Edit the types</h2>
	{#each types.current as type (type.id + 'option-list')}
		<div>
			<input
				type="text"
				value={type.name}
				name="name"
				oninput={({ currentTarget }) => {
					z.mutate.type.update({ id: type.id, name: currentTarget.value });
				}}
			/>
			<button
				class="ghost"
				onclick={async () => {
					z.mutate.type.remove(type.id);
				}}
			>
				🗑️
			</button>
		</div>
	{/each}
	<form method="dialog">
		<button>Close</button>
	</form>
</dialog>

<dialog id="todo_dialog" bind:this={todo_dialog}>
	<h2>Edit the todo</h2>
	<form method="dialog" onsubmit={edit_todo}>
		<input name="completed" type="checkbox" checked={current_todo.current?.completed} />
		<input name="id" type="hidden" value={current_todo.current?.id} />
		<input name="title" type="text" value={current_todo.current?.title} />
		<select name="type_id" value={current_todo.current?.type?.id}>
			{#each types.current as type (type.id + 'option-list')}
				<option value={type.id}>{type.name}</option>
			{/each}
		</select>
		<button>OK</button>
	</form>
</dialog>

```


Online Status

```svelte
{#if z.online}
	<div>Connected</div>
{:else}
	<div>Offline</div>
{/if}
```

See demo for real working code.

See Zero docs for more info.

Listen to [Syntax](Syntax.fm) for tasty web development treats.

## Contributing

- Run `npm ci` to install dependencies (Node 22+).
- Run `npm run verify` before pushing. It formats, then fails if it produced diffs, and runs lint, typecheck, build, and package.
- If a PR changes published code under `src/lib/**` or `package.json`, run `npm run changeset` and commit the generated `.changeset/*.md` file.
- If a PR is docs/CI/dev-only and shouldn’t trigger a release, apply the `skip-release` label.
- CI mirrors this flow and will gate PRs on missing changesets and uncommitted formatting.
