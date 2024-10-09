# Zero Svelte

Zero is the local first platform for building incedible, super fast apps.

To use Zero Svelte, you need to follow the Zero docs to get started.

## Install

## Usage

1. Follow LINK_TO_ZERO_DOCS to get started with Zero
1. Install `npm install zero-svelte`
1. Update vite.config.ts to have target 'es2022'.

```
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2022'
		}
	}
});
```

3. Use

```
import { z } from 'zero-svelte';
const todos = new Query(z.query.todo);
```

"todos" here is now reactive and will stay in sync with the persistant db and local data.

Mutations & queries are done with just standard Zero.

```javascript
z.mutate.todo.update({ id, completed });
```

See Zero docs for more info.

Listen to [Syntax](Syntax.fm) for tasty web development treats.
