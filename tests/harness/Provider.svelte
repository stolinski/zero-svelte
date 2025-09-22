<script lang="ts">
	import { setContext } from 'svelte';
	const { key, value, children } = $props<{ key: unknown; value: unknown }>();
	setContext(key as unknown as string | symbol, value as unknown);
</script>

{@render children()}
