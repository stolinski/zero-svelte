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

	$effect.pre(() => {
		if ('zero' in props) {
			const zero = props.zero as Z<S, MD>;
			setContext(ZERO_CONTEXT_KEY, zero);
			return;
		}

		const z = new Z(props);
		init?.(z);
		setContext(ZERO_CONTEXT_KEY, z);

		return () => {
			void z.close();
		};
	});
</script>

{@render children?.()}
