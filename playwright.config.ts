import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) loadEnvFile('.env');
for (const key of ['PUBLIC_SERVER', 'ZERO_UPSTREAM_DB', 'ZERO_QUERY_URL', 'ZERO_MUTATE_URL']) {
	const value = process.env[key];
	if (!value || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname)) {
		throw new Error(`Live tests require a local ${key}. See .env.example.`);
	}
}

export default defineConfig({
	testDir: './tests/browser',
	fullyParallel: false,
	workers: 1,
	globalTimeout: 5 * 60_000,
	timeout: 60_000,
	expect: { timeout: 20_000 },
	retries: 0,
	use: {
		baseURL: 'http://localhost:9370',
		channel: process.env.PLAYWRIGHT_CHANNEL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: [
		{
			command: 'pnpm run dev',
			url: 'http://localhost:9370',
			reuseExistingServer: !process.env.CI
		},
		{
			command: 'pnpm run dev:zero-cache',
			url: 'http://localhost:4848/keepalive',
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
			env: {
				ZERO_APP_ID: 'zero_svelte_smoke',
				ZERO_REPLICA_FILE: resolve('.svelte-kit/zero-live.db'),
				ZERO_NUM_SYNC_WORKERS: '1'
			}
		}
	]
});
