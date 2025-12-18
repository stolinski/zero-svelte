<script lang="ts">
	import './styles.css';
	import { queries, zql } from '../schema.js';
	import { z, mutators } from './zero.svelte.js';

	let showCompleted = $state(false);
	let typeFilter = $state('');
	let searchText = $state('');

	// Basic query - syncs all todos from server
	const todos = z.createQuery(queries.todo.all());

	// Query using defineQuery
	const types = z.createQuery(queries.type.all());

	// Local-only filtered query using raw ZQL
	// This filters data already synced by todos query - no server round-trip per keystroke
	// Note: For small datasets, you can also use .filter() on todos.data instead:
	// const filtered = $derived(todos.data.filter(t => t.title.includes(searchText)));
	// ZQL is better for large datasets (indexing) and when you need .related()
	const searchFilteredTodos = $derived.by(() => {
		let q = zql.todo.related('type');
		if (searchText) {
			q = q.where('title', 'ILIKE', `%${searchText}%`);
		}
		if (typeFilter) {
			q = q.where('type_id', '=', typeFilter);
		}
		return z.createQuery(q);
	});

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

<!-- Connection State Demo -->
<!-- z.connectionState provides rich connection status (analogous to React's useConnectionState hook) -->
<!-- States: connecting | connected | disconnected | needs-auth | error | closed -->
<div class="connection-status">
	{#if z.connectionState.name === 'connected'}
		<span class="status connected">Connected</span>
	{:else if z.connectionState.name === 'connecting'}
		<span class="status connecting">Connecting...</span>
	{:else if z.connectionState.name === 'disconnected'}
		<span class="status disconnected">Disconnected: {z.connectionState.reason}</span>
	{:else if z.connectionState.name === 'error'}
		<span class="status error">
			Error: {z.connectionState.reason}
			<button onclick={() => z.connection.connect()}>Retry</button>
		</span>
	{:else if z.connectionState.name === 'closed'}
		<span class="status closed">Closed</span>
	{/if}
</div>

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

	<h2>Local-only filtering (text search + type filter)</h2>
	<p>Uses raw ZQL to filter locally - no server round-trip per keystroke</p>
	<input type="text" placeholder="Search todos..." bind:value={searchText} />
	<select name="type_filter" onchange={(e) => (typeFilter = (e.target as HTMLSelectElement).value)}>
		<option value="">All Types</option>
		{#each types.data as type (type.id + 'filter-option')}
			<option value={type.id}>{type.name}</option>
		{/each}
	</select>
	<ul>
		{#each searchFilteredTodos.data as todo (todo.id + 'search')}
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

	<hr />

	<h2>Server-synced query (defineQuery)</h2>
	<label>
		Show Completed Only:
		<input type="checkbox" name="filter_option" bind:checked={showCompleted} />
	</label>
	<p>Uses defineQuery - registers with server</p>
	{#each filtered_todos.data as todo (todo.id + 'filtered')}
		<div>
			{todo.title} - {todo.type?.name}
		</div>
	{/each}
</div>
