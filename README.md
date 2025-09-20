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

lib/z.svelte.ts (or whatever you'd like to name)

```ts
import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from 'zero-svelte';
import { schema, type Schema } from '../zero-schema.js';
// Schema is imported from wherever your Schema type lives.
// via export type Schema = typeof schema;

export function get_z_options() {
	return {
		userID: 'anon',
		server: PUBLIC_SERVER,
		schema
		// ... other options
	} as const;
}

export const z = new Z<Schema>(get_z_options());
```

+layout.server.ts

```ts
export const ssr = false;
```

+page.svelte

```svelte
<script lang="ts">
	import { Query } from 'zero-svelte';
	import { z } from '$lib/z.svelte';

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

"todos" here is now reactive and will stay in sync with the persistent db and local data.

Mutations & queries are done with just standard Zero.

```javascript
z.current.mutate.todo.update({ id, completed });
```

See demo for real working code.

See Zero docs for more info.

Listen to [Syntax](Syntax.fm) for tasty web development treats.
