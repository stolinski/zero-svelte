<script module lang="ts">
	// Export a typed version of useZero that knows about your specific schema
	// If using custom mutators, pass them in as the second type argument, such as <Schema, ReturnType<typeof createMutators>>
	export const useZero = () => useZeroGeneric<Schema>();
	import ZeroProvider, { useZero as useZeroGeneric } from '$lib/zero-provider.svelte';
</script>

<script lang="ts">
	import { PUBLIC_SERVER } from '$env/static/public';
	import { type ZeroOptions } from '@rocicorp/zero';
	import { schema, type Schema } from '../../schema.js';

	let { children } = $props();

	// If using custom mutators, pass them in as the second type argument, such as: ZeroOptions<Schema, ReturnType<typeof createMutators>>
	const zeroOpts: ZeroOptions<Schema> = {
		server: PUBLIC_SERVER,
		schema,
		userID: 'anon',
		kvStore: 'mem'
	};
</script>

<ZeroProvider {...zeroOpts}>
	{@render children?.()}
</ZeroProvider>
