<script module lang="ts">
	import type { CustomMutatorDefs, Schema, ZeroOptions } from '@rocicorp/zero';
	import { getContext, setContext } from 'svelte';
	import { Z } from './Z.svelte.js';

	const ZERO_CONTEXT_KEY = Symbol.for('zero-provider');

	export function useZero<
		S extends Schema,
		MD extends CustomMutatorDefs<S> | undefined = undefined
	>(): Z<S, MD> {
		const zero = getContext(ZERO_CONTEXT_KEY);
		if (zero === undefined) {
			throw new Error('useZero must be used within a ZeroProvider');
		}
		return zero as Z<S, MD>;
	}
</script>

<script
	lang="ts"
	generics="S extends Schema, MD extends CustomMutatorDefs<S> | undefined = undefined"
>
	type Props = (ZeroOptions<S, MD> | { zero: Z<S, MD> }) & {
		init?: (zero: Z<S, MD>) => void;
		children?: import('svelte').Snippet;
	};

	let { init = () => {}, children, ...props }: Props = $props();

	// If Zero is not passed in, we construct it, but only client-side.
	// Zero doesn't really work SSR today so this is usually the right thing.
	// When we support Zero SSR this will either become a breaking change or
	// more likely server support will be opt-in with a new prop on this
	// component.

	let z: Z<S, MD>;

	if ('zero' in props) {
		z = props.zero as Z<S, MD>;
	} else {
		z = new Z(props);
		init?.(z);
	}

	setContext(ZERO_CONTEXT_KEY, z);

	// Cleanup the Zero instance when this component is destroyed.
	$effect(() => {
		return () => {
			z.close();
			setContext(ZERO_CONTEXT_KEY, undefined);
		};
	});
</script>

{@render children?.()}
