# Zero Svelte

Zero is the local first platform for building incredible, super fast apps.

To use Zero Svelte, you need to follow the Zero docs to get started.

Watch this
[Zero Sync Makes Local First Easy](https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax)

[<img src="./zero1.png">](https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax)

## Usage

1. Follow [ZERO DOCS](https://zero.rocicorp.dev/docs/introduction) to get started with Zero
1. Install `npm install zero-svelte`
1. Usage

+layout.svelte

```ts
import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from 'zero-svelte';
import { schema, type Schema } from '../zero-schema.js';
// Schema is imported from wherever your Schema type lives.
// via export type Schema = typeof schema;
const { children } = $props();

new Z<Schema>({
	userID: 'anon',
	// userID: user_id, possibly from loader?
	server: PUBLIC_SERVER,
	schema
	// auth: data.jwt,
});

{@render children()}
```

+layout.server.ts

```ts
export const ssr = false;
```

$lib/z.svelte.ts

```svelte
import { Z } from 'zero-svelte';
import { schema, type Schema } from '../schema'; // wherever your Zero schema lives
import { getContext } from 'svelte';

export function get_z() {
	return getContext('z') as Z<Schema>;
}
```

+page.svelte (basic example)

```svelte
<script lang="ts">
	import { Query } from 'zero-svelte';
	import { get_z } from '$lib/z.svelte';
	const z = get_z();
	// You could also do
	// const z = getContext('z') as Z<Schema>
	// Instead of creating a typed context wrapper

	// Basic: always enabled; materializes immediately
	const todos = new Query(z.current.query.todo);

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const id = randID();
		if (newTodo) {
			z.current.mutate.todo.insert({ id, title: newTodo, completed: false });
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.current.mutate.todo.update({ id, completed });
	}
</script>

<div>
	<h1>Todo</h1>
	<form {onsubmit}>
		<input type="text" id="newTodo" name="newTodo" />
		<button type="submit">Add</button>
	</form>
	<ul>
		{#each todos.current as todo}
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
	import { Query } from 'zero-svelte';
	import { get_z } from '$lib/z.svelte';
	const z = get_z();

	// Gate materialization using the `enabled` flag.
	// When false, the query won't materialize or register listeners,
	// and `current` will be the default snapshot until re-enabled.
	let todosEnabled = $state(true);
	const todos = $derived.by(() => new Query(z.current.query.todo, todosEnabled));

	const randID = () => Math.random().toString(36).slice(2);
	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const id = randID();
		if (newTodo) {
			z.current.mutate.todo.insert({ id, title: newTodo, completed: false });
			(event.target as HTMLFormElement).reset();
		}
	}
	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.current.mutate.todo.update({ id, completed });
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
		{#each todos.current as todo}
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
	import { Query } from 'zero-svelte';
	import { get_z } from '$lib/z.svelte';
	import { queries } from '$lib/schema.js'; // adjust path to your schema/queries
	const z = get_z();

	let filtered_type: string | undefined = $state();

	// Create once
	const todos = new Query(z.current.query.todo.related('type'));
	const types = new Query(queries.allTypes());

	function applyFilter(value: string) {
		const ft = value || undefined;
		filtered_type = ft;
		const q = ft
			? z.current.query.todo.where('type_id', '=', ft).related('type')
			: z.current.query.todo.related('type');
		todos.updateQuery(q);
	}
</script>

<select
	name="todo_type"
	id="todo_type"
	onchange={(e) => applyFilter((e.target as HTMLSelectElement).value)}
>
	<option value="">All</option>
	{#each types.current as type (type.id)}
		<option value={type.id}>{type.name}</option>
	{/each}
</select>

<ul>
	{#each todos.current as todo (todo.id)}
		<li>{todo.title} - {todo.type?.name}</li>
	{/each}
</ul>
```

"todos" here is now reactive and will stay in sync with the persistent db and local data.

Mutations & queries are done with just standard Zero.

```javascript
z.current.mutate.todo.update({ id, completed });
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
