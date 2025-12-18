# Zero Svelte

Zero is the local first platform for building incredible, super fast apps.

To use Zero Svelte, you need to follow the Zero docs to get started.

Watch this
[Zero Sync Makes Local First Easy](https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax)

[<img src="./zero1.png">](https://www.youtube.com/watch?v=hAxdOUgjctk&ab_channel=Syntax)

## Usage

1. Follow [ZERO DOCS](https://zero.rocicorp.dev/docs/introduction) to get started with Zero
2. Install `npm install zero-svelte`
3. Usage

### Schema Setup

Define your schema with `defineQueries` for type-safe, reusable queries:

`src/schema.ts`

```ts
import {
	boolean,
	createBuilder,
	createSchema,
	defineQueries,
	defineQuery,
	relationships,
	string,
	table
} from '@rocicorp/zero';
import { type } from 'arktype'; // or use zod

const types = table('type').columns({ id: string(), name: string() }).primaryKey('id');

const todos = table('todo')
	.columns({
		id: string(),
		title: string(),
		completed: boolean(),
		type_id: string()
	})
	.primaryKey('id');

const todoRelationship = relationships(todos, ({ one }) => ({
	type: one({
		sourceField: ['type_id'],
		destField: ['id'],
		destSchema: types
	})
}));

export const schema = createSchema({
	tables: [types, todos],
	relationships: [todoRelationship]
});

export type Schema = typeof schema;

// Create a typed ZQL builder for raw queries
export const zql = createBuilder(schema);

// Define reusable queries with validators
export const queries = defineQueries({
	todo: {
		all: defineQuery(() => zql.todo.related('type')),
		byCompleted: defineQuery(type({ completed: 'boolean' }), ({ args: { completed } }) =>
			zql.todo.where('completed', '=', completed).related('type')
		)
	},
	type: {
		all: defineQuery(() => zql.type)
	}
});

// Register schema as default type for Zero (removes need for explicit generics)
declare module '@rocicorp/zero' {
	interface DefaultTypes {
		schema: Schema;
	}
}
```

### Create your Z instance

`src/lib/zero.svelte.ts`

```ts
import { PUBLIC_SERVER } from '$env/static/public';
import { Z } from 'zero-svelte';
import { mutators } from '../mutators.js';
import { schema } from '../schema.js';

// No need for explicit Schema generic when using DefaultTypes
export const z = new Z({
	cacheURL: PUBLIC_SERVER,
	schema,
	mutators,
	userID: 'anon',
	kvStore: 'mem'
});

export { mutators };
```

### Disable SSR

Make sure your app has SSR turned off.

`+page.ts` or `+layout.ts`

```ts
export const ssr = false;
```

### Basic Usage

`+page.svelte`

```svelte
<script lang="ts">
	import { z, mutators } from '$lib/zero.svelte';
	import { queries } from '../schema.js';

	// Create a query using defineQuery
	const todos = z.createQuery(queries.todo.all());

	const randID = () => Math.random().toString(36).slice(2);

	function onsubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const title = formData.get('title') as string;
		if (title) {
			// Mutations use the mutators pattern
			z.mutate(mutators.todo.insert({ id: randID(), title, completed: false, type_id: '' }));
			(event.target as HTMLFormElement).reset();
		}
	}

	function toggleTodo(id: string, completed: boolean) {
		z.mutate(mutators.todo.update({ id, completed }));
	}
</script>

<form {onsubmit}>
	<input type="text" name="title" />
	<button type="submit">Add</button>
</form>

<ul>
	{#each todos.data as todo (todo.id)}
		<li>
			<input
				type="checkbox"
				checked={todo.completed}
				oninput={() => toggleTodo(todo.id, !todo.completed)}
			/>
			{todo.title} - {todo.type?.name}
		</li>
	{/each}
</ul>
```

### Reactive Queries with $derived

Use `$derived` to create queries that react to state changes:

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
	import { queries } from '../schema.js';

	let showCompleted = $state(false);

	// Query recreates when showCompleted changes
	const filtered = $derived(z.createQuery(queries.todo.byCompleted({ completed: showCompleted })));
</script>

<label>
	<input type="checkbox" bind:checked={showCompleted} />
	Show completed only
</label>

{#each filtered.data as todo (todo.id)}
	<div>{todo.title}</div>
{/each}
```

### Local-only Filtering with Raw ZQL

For client-side filtering without server round-trips (great for search):

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
	import { zql } from '../schema.js';

	let searchText = $state('');

	// Filters data already synced - no server round-trip per keystroke
	const searchResults = $derived.by(() => {
		let q = zql.todo.related('type');
		if (searchText) {
			q = q.where('title', 'ILIKE', `%${searchText}%`);
		}
		return z.createQuery(q);
	});
</script>

<input type="text" placeholder="Search..." bind:value={searchText} />

{#each searchResults.data as todo (todo.id)}
	<div>{todo.title}</div>
{/each}
```

### Connection State

Monitor connection status with `connectionState` (analogous to React's `useConnectionState` hook):

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
</script>

<!-- States: connecting | connected | disconnected | needs-auth | error | closed -->
{#if z.connectionState.name === 'connected'}
	<span>Connected</span>
{:else if z.connectionState.name === 'connecting'}
	<span>Connecting...</span>
{:else if z.connectionState.name === 'disconnected'}
	<span>Disconnected: {z.connectionState.reason}</span>
{:else if z.connectionState.name === 'needs-auth'}
	<span>
		Auth Required
		<button onclick={() => z.connection.connect()}>Retry</button>
	</span>
{:else if z.connectionState.name === 'error'}
	<span>
		Error: {z.connectionState.reason}
		<button onclick={() => z.connection.connect()}>Retry</button>
	</span>
{:else if z.connectionState.name === 'closed'}
	<span>Closed</span>
{/if}
```

Use `z.connection.connect()` to manually retry connections, optionally with a new auth token:

```ts
// Retry connection
await z.connection.connect();

// Retry with new auth token
await z.connection.connect({ auth: newToken });
```

### Query with Enabled Flag

Gate query materialization using the `enabled` parameter:

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
	import { queries } from '../schema.js';

	let enabled = $state(true);

	// Query won't materialize until enabled is true
	const todos = $derived(z.createQuery(queries.todo.all(), enabled));
</script>

<label>
	<input type="checkbox" bind:checked={enabled} />
	Enable query
</label>
```

### Updating Queries with updateQuery

For stable query instances that update in place:

```svelte
<script lang="ts">
	import { z } from '$lib/zero.svelte';
	import { zql } from '../schema.js';

	const todos = z.createQuery(zql.todo.related('type'));

	function applyFilter(typeId: string | undefined) {
		const q = typeId
			? zql.todo.where('type_id', '=', typeId).related('type')
			: zql.todo.related('type');
		todos.updateQuery(q);
	}
</script>
```

## API Reference

### Z Class

- `z.createQuery(query, enabled?)` - Create a reactive query
- `z.q(query, enabled?)` - Alias for createQuery
- `z.mutate(mutator)` - Execute a mutation
- `z.connectionState` - Current connection state (reactive)
- `z.connection` - Connection API for manual control
- `z.connection.connect(opts?)` - Retry connection from error/needs-auth state
- `z.online` - _(deprecated)_ Use `connectionState` instead
- `z.build(options)` - Rebuild the Zero instance (useful for auth changes)
- `z.close()` - Close the Zero instance

### Query Class

- `query.data` - The query results (reactive)
- `query.details` - Query status details
- `query.updateQuery(newQuery, enabled?)` - Update the query in place

See demo for real working code.

See [Zero docs](https://zero.rocicorp.dev/docs/introduction) for more info.

Listen to [Syntax](https://Syntax.fm) for tasty web development treats.

## Contributing

- Run `pnpm install` to install dependencies (Node 22+).
- Run `pnpm run verify` before pushing. It formats, lints, typechecks, builds, and packages.
- If a PR changes published code under `src/lib/**` or `package.json`, run `pnpm changeset` and commit the generated `.changeset/*.md` file.
- If a PR is docs/CI/dev-only and shouldn't trigger a release, apply the `skip-release` label.
- CI mirrors this flow and will gate PRs on missing changesets and uncommitted formatting.
