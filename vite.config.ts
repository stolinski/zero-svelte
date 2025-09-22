import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['tests/setup.ts']
	},

	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2022'
		}
	}
});
