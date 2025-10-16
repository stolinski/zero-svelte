<script lang="ts">
	import './styles.css';
	import { queries } from '../schema.js';
	import { z } from './zero.svelte.js';

	// BASIC QUERY
	// Stable Query instance; update when filter changes via event
	const todos = z.createQuery(z.query.todo.related('type'));

	function applyFilter(value: string) {
		const ft = value || undefined;
		const q = ft
			? z.query.todo.where('type_id', '=', ft).related('type')
			: z.query.todo.related('type');
		todos.updateQuery(q);
	}

	// BASIC QUERY + SYNCED QUERY API (soon to be deafult)
	const types = z.createQuery(queries.allTypes());

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_name = formData.get('todo_name') as string;
		const todo_type = formData.get('todo_type') as string;
		const id = randID();
		if (todo_name) {
			// BASIC MUTATION
			z.mutate.todo.insert({ id, title: todo_name, completed: false, type_id: todo_type });
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.mutate.todo.update({ id, completed });
	}

	function add_type(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const todo_type = formData.get('type') as string;
		const id = randID();
		if (todo_type) {
			z.mutate.type.insert({ id, name: todo_type });
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
	<select
		name="todo_type"
		id="todo_type"
		onchange={(e) => applyFilter((e.target as HTMLSelectElement).value)}
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
</div>
