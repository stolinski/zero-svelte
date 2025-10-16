import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 9370,
		strictPort: true
	},
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2022'
		}
	}
});
