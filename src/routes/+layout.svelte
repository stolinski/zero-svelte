<script lang="ts">
	import ZeroInit from '$lib/components/zero-init.svelte';

	let { children } = $props();
</script>

<ZeroInit>
	{@render children?.()}
</ZeroInit>
