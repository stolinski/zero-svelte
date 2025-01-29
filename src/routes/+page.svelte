<script lang="ts">
	import { PUBLIC_SERVER } from '$env/static/public';
	import { Query, Z } from '$lib/index.js';
	import { schema, type Schema } from '../zero-schema.js';

	// init the zero Object
	const z = new Z<Schema>({
		server: PUBLIC_SERVER, // http://localhost:4848 in dev
		schema,
		userID: 'anon'
		// kvStore: 'mem' // its handy to use memory when making schema changes
	});

	const todos = new Query(z.current.query.todo.related('type'));
	const types = new Query(z.current.query.type);

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const todoType = formData.get('todoType') as string;
		const id = randID();
		if (newTodo) {
			z.current.mutate.todo.insert({ id, title: newTodo, completed: false, type_id: todoType });
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const id = checkbox.value;
		const completed = checkbox.checked;
		z.current.mutate.todo.update({ id, completed });
	}

	function deleteTodo(id: string) {
		z.current.mutate.todo.delete({ id });
	}
</script>

<div>
	<h1>Todo</h1>
	<form {onsubmit}>
		<div>
			Type:
			<select name="todoType" placeholder="Select todo type">
				{#each types.current as type}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</div>
		Todo
		<input type="text" id="newTodo" name="newTodo" />
		<button type="submit">Add</button>
	</form>
	<ul>
		{#each todos.current as todo}
			<li>
				<span>
					<input type="checkbox" value={todo.id} checked={todo.completed} oninput={toggleTodo} />
				</span>
				<span class="title-text">{todo.title}</span>
				<span class="type-text">({todo.type?.name})</span>
				{#if todo.completed}
					<span> <button onclick={() => deleteTodo(todo.id)}>X</button> </span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.title-text {
		font-size: large;
		font-weight: bold;
	}

	.type-text {
		color: gray;
		font-size: small;
	}
</style>
