import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Ensure DOM is reset between tests
afterEach(() => {
	cleanup();
});
