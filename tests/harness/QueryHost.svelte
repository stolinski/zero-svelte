<script lang="ts">
	import { setContext } from 'svelte';
	import { Query } from '$lib/query.svelte.js';
	import type { Query as QueryDef, Schema, TypedView } from '@rocicorp/zero';

	type ZStub = {
		current: {
			materialize: (
				q: QueryDef<Schema, string & keyof Schema['tables'], unknown>
			) => TypedView<unknown>;
			userID?: string;
		};
	};

	const {
		z,
		query,
		enabled = true,
		register
	} = $props<{
		z: ZStub;
		query: QueryDef<Schema, string & keyof Schema['tables'], unknown>;
		enabled?: boolean;
		register?: (api: {
			updateQuery: (
				q: QueryDef<Schema, string & keyof Schema['tables'], unknown>,
				enabled?: boolean
			) => void;
			z: ZStub;
		}) => void;
	}>();

	setContext('z', z);
	const q = new Query<Schema, string & keyof Schema['tables'], unknown>(query, enabled);

	register?.({
		updateQuery: (newQ: QueryDef<Schema, string & keyof Schema['tables'], unknown>, en = true) =>
			q.updateQuery(newQ, en),
		z
	});
</script>

<div data-testid="data">{q.current === undefined ? 'undefined' : JSON.stringify(q.current)}</div>
<div data-testid="details">{JSON.stringify(q.details)}</div>
