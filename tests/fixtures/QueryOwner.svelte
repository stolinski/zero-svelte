<script>
	import { untrack } from 'svelte';

	let { setup } = $props();
	untrack(() => setup());
</script>
