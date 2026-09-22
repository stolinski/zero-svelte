import { compile, compileModule } from 'svelte/compiler';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		{
			// Compile with the installed Svelte version, including our oldest supported
			// version, independently of the demo app's Vite plugin peer requirements.
			name: 'svelte-compatibility-tests',
			enforce: 'pre',
			transform(code, id) {
				if (/\.svelte\.[jt]s$/.test(id)) {
					const { outputText } = ts.transpileModule(code, {
						compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }
					});
					return compileModule(outputText, {
						filename: id,
						generate: 'client',
						dev: process.env.NODE_ENV !== 'production'
					}).js;
				}
				if (id.endsWith('.svelte')) {
					return compile(code, {
						filename: id,
						generate: 'client',
						dev: process.env.NODE_ENV !== 'production'
					}).js;
				}
			}
		}
	],
	resolve: { conditions: ['browser'] },
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.svelte.ts'],
		server: { deps: { inline: ['svelte', 'zero-svelte'] } }
	}
});
