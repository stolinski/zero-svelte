<script lang="ts">
	import './styles.css';
	import { PUBLIC_SERVER } from '$env/static/public';
	import { Query } from '$lib/query.svelte.js';
	import { Z } from '$lib/Z.svelte.js';
	import { queries, schema, type Schema } from '../schema.js';

	const z = new Z<Schema>({
		server: PUBLIC_SERVER,
		schema,
		userID: 'anon',
		kvStore: 'mem'
	});

	let filtered_type: string | undefined = $state();

	// We wrap the query in a $derived.by or a $derived to update whenever a reactive var updates.
	const todos = $derived.by(() => {
		if (filtered_type) {
			return new Query(z.current.query.todo.where('type_id', '=', filtered_type).related('type'));
		}
		return new Query(z.current.query.todo.related('type'));
	});
	// Basic query
	const types = new Query(queries.allTypes());

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_name = formData.get('todo_name') as string;
		const todo_type = formData.get('todo_type') as string;
		const id = randID();
		if (todo_name) {
			z.current.mutate.todo.insert({ id, title: todo_name, completed: false, type_id: todo_type });
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.current.mutate.todo.update({ id, completed });
	}

	function add_type(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_type = formData.get('type') as string;
		const id = randID();
		if (todo_type) {
			z.current.mutate.type.insert({ id, name: todo_type });
			(event.target as HTMLFormElement).reset();
		}
	}
</script>

<div>
	<form onsubmit={add_type}>
		<input type="text" id="type" name="type" />
		<button type="submit">Add Type</button>
	</form>
	<form {onsubmit}>
		<input type="text" id="todo_name" name="todo_name" />
		<select name="todo_type" id="todo_type">
			{#each types.current as type (type.id)}
				<option value={type.id}>{type.name}</option>
			{/each}
		</select>
		<button type="submit">Add</button>
	</form>
	<h1>Todos</h1>
	<select bind:value={filtered_type} name="todo_type" id="todo_type">
		{#each types.current as type (type.id + 'option-list')}
			<option value={type.id}>{type.name}</option>
		{/each}
	</select>
	<ul>
		{#each todos.current as todo (todo.id)}
			<li>
				<input
					type="checkbox"
					value={todo.id}
					checked={todo.completed}
					oninput={toggleTodo}
				/>{todo.title} - {todo.type?.name}
			</li>
		{/each}
	</ul>
</div>
