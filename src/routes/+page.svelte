<script lang="ts">
	import { PUBLIC_SERVER } from '$env/static/public';
	import { Query } from '$lib/Query.svelte.js';
	import { Z } from '$lib/Z.svelte.js';
	import { schema, type Schema } from '../zero-schema.js';
	const z = new Z<Schema>({
		server: PUBLIC_SERVER,
		schema,
		userID: 'anon'
	});

	const todos = new Query(z.current.query.todo.related('type', (type) => type.name));

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const id = randID();
		if (newTodo) {
			z.current.mutate.todo.insert({ id, title: newTodo, completed: false, type_id: '1' });
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
		pnp
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
