<script lang="ts">
	import { setContext } from 'svelte';
	const { key, value } = $props<{ key: unknown; value: unknown }>();
	setContext(key as any, value);
</script>

<slot />
