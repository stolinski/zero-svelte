<script lang="ts">
	import { Query } from '$lib/Query.svelte.js';
	import { z } from '../zero-schema.js';

	const todos = new Query(z.query.todo);

	const randID = () => Math.random().toString(36).slice(2);

	function addTodo(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const newTodo = formData.get('newTodo') as string;
		const id = randID();
		if (newTodo) {
			z.mutate.todo.create({ id, title: newTodo, completed: false });
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

<!-- Thoughts -->
<!-- Auth patterns? -->
<!-- Access control? -->

<div>
	<h1>Todo</h1>
	<form onsubmit={addTodo}>
		<input type="text" id="newTodo" name="newTodo" />
		<button type="submit">Add</button>
	</form>
	<ul>
		{#each todos?.data as todo}
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
