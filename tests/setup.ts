import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// Ensure DOM is reset between tests
afterEach(() => {
	cleanup();
});
