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
