<script lang="ts">
	import './styles.css';
	import { queries } from '../schema.js';
	import { z, mutators } from './zero.svelte.js';

	let showCompleted = $state(false);
	let typeFilter = $state('');

	// Basic query - all todos
	const todos = z.createQuery(queries.todo.all());

	// Query using defineQuery
	const types = z.createQuery(queries.type.all());

	// Filtered query using $derived - recreates when showCompleted changes
	const filtered_todos = $derived(
		z.createQuery(queries.todo.byCompleted({ completed: showCompleted }))
	);

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_name = formData.get('todo_name') as string;
		const todo_type = formData.get('todo_type') as string;
		const id = randID();
		if (todo_name) {
			// MUTATION using defineMutator pattern
			z.mutate(
				mutators.todo.insert({ id, title: todo_name, completed: false, type_id: todo_type })
			);
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.mutate(mutators.todo.update({ id, completed }));
	}

	function add_type(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_type = formData.get('type') as string;
		const id = randID();
		if (todo_type) {
			z.mutate(mutators.type.insert({ id, name: todo_type }));
			(event.target as HTMLFormElement).reset();
		}
	}
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
		Show Completed Only:
		<input type="checkbox" name="filter_option" bind:checked={showCompleted} />
	</label>

	<select
		name="todo_type"
		id="todo_type"
		onchange={(e) => (typeFilter = (e.target as HTMLSelectElement).value)}
	>
		<option value="">All</option>
		{#each types.data as type (type.id + 'option-list')}
			<option value={type.id}>{type.name}</option>
		{/each}
	</select>
	<ul>
		{#each todos.data as todo (todo.id)}
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

	<p>Just a quick demo to show the filtered_todos working.</p>
	{#each filtered_todos.data as todo (todo.id + 'filtered')}
		<div>
			{todo.title} - {todo.type?.name}
		</div>
	{/each}
</div>
