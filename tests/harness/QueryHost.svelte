<script lang="ts">
	import { setContext } from 'svelte';
	import { Query } from '$lib/query.svelte';
	import type { Query as QueryDef } from '@rocicorp/zero';

	type ZStub = { current: { materialize: (q: any) => any; userID?: string } };

	const {
		z,
		query,
		enabled = true,
		register
	} = $props<{
		z: ZStub;
		query: QueryDef<any, any, any>;
		enabled?: boolean;
		register?: (api: {
			updateQuery: (q: QueryDef<any, any, any>, enabled?: boolean) => void;
			z: ZStub;
		}) => void;
	}>();

	setContext('z', z);
	const q = new Query<any, any, any>(query, enabled);

	register?.({
		updateQuery: (newQ, en = true) => q.updateQuery(newQ, en),
		z
	});
</script>

<div data-testid="data">{q.current === undefined ? 'undefined' : JSON.stringify(q.current)}</div>
<div data-testid="details">{JSON.stringify(q.details)}</div>
