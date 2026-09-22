import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const upstream = process.env.ZERO_UPSTREAM_DB;
if (!upstream || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(upstream).hostname)) {
	throw new Error(
		'Live smoke tests require a local ZERO_UPSTREAM_DB; refusing to write elsewhere.'
	);
}
const pool = new Pool({ connectionString: upstream });
const prefix = `zero-svelte-e2e-${randomUUID()}`;
const typeID = `${prefix}-type`;
const pendingID = `${prefix}-pending`;
const completedID = `${prefix}-completed`;
const pageErrors = new Map<Page, string[]>();
const consoleErrors = new Map<Page, string[]>();

function recordErrors(page: Page): void {
	const errors: string[] = [];
	pageErrors.set(page, errors);
	page.on('pageerror', (error) => errors.push(error.message));
	const messages: string[] = [];
	consoleErrors.set(page, messages);
	page.on('console', (message) => {
		if (message.type() === 'error') messages.push(message.text());
	});
}

async function openDemo(page: Page): Promise<void> {
	recordErrors(page);
	await page.goto('/');
	await expect(page.locator('.connection-status')).toHaveText('Connected');
}

async function totalRows(): Promise<number> {
	return (await pool.query<{ count: number }>('SELECT count(*)::int AS count FROM todo')).rows[0]
		.count;
}

async function appModules(page: Page): Promise<{ demoURL: string; schemaURL: string }> {
	await page.getByRole('heading', { name: 'Todos', exact: true }).waitFor();
	return page.evaluate(() => {
		// Vite adds HMR timestamps. Import the exact module used by the page;
		// importing a bare URL can silently construct a second, unrelated Z instance.
		const entries = performance.getEntriesByType('resource');
		const find = (path: string): string => {
			const entry = entries.findLast((entry) => new URL(entry.name).pathname === path);
			if (!entry) throw new Error(`App module was not loaded: ${path}`);
			return entry.name;
		};
		return {
			demoURL: find('/src/routes/zero.svelte.ts'),
			schemaURL: find('/src/schema.ts')
		};
	});
}

async function useIndexedDB(page: Page, userID: string): Promise<void> {
	await page.evaluate(
		async ({ demoURL, schemaURL, userID }) => {
			const { z, mutators } = await import(demoURL);
			const { schema } = await import(schemaURL);
			z.build({ schema, mutators, userID, cacheURL: 'http://localhost:4848', kvStore: 'idb' });
		},
		{ ...(await appModules(page)), userID }
	);
}

test.beforeAll(async () => {
	await pool.query('INSERT INTO type (id, name) VALUES ($1, $2)', [typeID, `${prefix} type`]);
	await pool.query(
		'INSERT INTO todo (id, title, completed, type_id) VALUES ($1, $2, false, $3), ($4, $5, true, $3)',
		[pendingID, `${prefix} pending`, typeID, completedID, `${prefix} completed`]
	);
});

test.afterEach(async ({ context }, testInfo) => {
	await testInfo.attach('browser-errors', {
		body: JSON.stringify(
			{
				urls: context.pages().map((page) => page.url()),
				page: [...pageErrors.values()].flat(),
				console: [...consoleErrors.values()].flat()
			},
			null,
			2
		),
		contentType: 'application/json'
	});
	const disconnectTest = /offline|without sync/.test(testInfo.title);
	try {
		for (const errors of pageErrors.values()) expect(errors).toEqual([]);
		for (const messages of consoleErrors.values()) {
			const unexpected = messages.filter(
				(message) =>
					!(disconnectTest && /Failed to connect|WebSocket connection.*failed/.test(message))
			);
			expect(unexpected).toEqual([]);
		}
	} finally {
		pageErrors.clear();
		consoleErrors.clear();
	}
});

test.afterAll(async () => {
	// Never truncate or reset the shared demo database. Only this run's unique records.
	await pool.query('DELETE FROM todo WHERE id LIKE $1 OR title LIKE $1', [`${prefix}%`]);
	await pool.query('DELETE FROM type WHERE id = $1 OR name LIKE $2', [typeID, `${prefix}%`]);
	await pool.end();
});

test('cold load syncs ALL rows before any filter interaction', async ({ page }, testInfo) => {
	const total = await totalRows();
	await openDemo(page);
	await expect(page.locator('ul li')).toHaveCount(total);
	await expect(page.locator('ul li').filter({ hasText: `${prefix} completed` })).toHaveCount(1);
	await expect(page.locator('ul li').filter({ hasText: `${prefix} pending` })).toHaveCount(1);

	const result = await page.evaluate(
		async ({ demoURL, schemaURL }) => {
			const { z } = await import(demoURL);
			const { queries } = await import(schemaURL);
			const query = z.q(queries.todo.all());
			try {
				const deadline = Date.now() + 20_000;
				while (query.details.type !== 'complete' && Date.now() < deadline) {
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
				return { type: query.details.type, count: query.data.length };
			} finally {
				query.destroy();
			}
		},
		await appModules(page)
	);
	expect(result).toEqual({ type: 'complete', count: total });
	await page.screenshot({ path: testInfo.outputPath('all-rows.png'), fullPage: true });
});

test('local text/type filters and server filters retain their different semantics', async ({
	page
}) => {
	await openDemo(page);
	await expect(page.locator('ul li')).toHaveCount(await totalRows());
	await page.getByPlaceholder('Search todos...').fill(prefix);
	await expect(page.locator('ul li')).toHaveCount(2);
	await page.locator('select[name="type_filter"]').selectOption(typeID);
	await expect(page.locator('ul li')).toHaveCount(2);
	await page.getByPlaceholder('Search todos...').fill(`${prefix} pending`);
	await expect(page.locator('ul li')).toHaveCount(1);
	const serverRows = page.locator('h2:has-text("Server-synced query") ~ div');
	await expect(serverRows.filter({ hasText: `${prefix} pending` })).toHaveCount(1);
	await expect(serverRows.filter({ hasText: `${prefix} completed` })).toHaveCount(0);
	await page.getByLabel('Show Completed Only:').check();
	await expect(serverRows.filter({ hasText: `${prefix} completed` })).toHaveCount(1);
	await expect(serverRows.filter({ hasText: `${prefix} pending` })).toHaveCount(0);
	// Changing the server filter must not evict rows held by the all-todos query.
	await expect(page.locator('ul li').filter({ hasText: `${prefix} pending` })).toHaveCount(1);
});

test('UI mutations persist to Postgres and replicate into a second tab', async ({
	page,
	context
}) => {
	const second = await context.newPage();
	await openDemo(page);
	await openDemo(second);
	const typeName = `${prefix} type created from UI`;
	await page.locator('#type').fill(typeName);
	await page.getByRole('button', { name: 'Add Type', exact: true }).click();
	await expect
		.poll(
			async () => (await pool.query('SELECT id FROM type WHERE name = $1', [typeName])).rowCount
		)
		.toBe(1);
	const uiTypeID = (
		await pool.query<{ id: string }>('SELECT id FROM type WHERE name = $1', [typeName])
	).rows[0].id;
	await expect(second.locator('#todo_type option').filter({ hasText: typeName })).toHaveCount(1);
	const title = `${prefix} created from UI`;
	await page.locator('#todo_name').fill(title);
	await page.locator('#todo_type').selectOption(uiTypeID);
	await page.getByRole('button', { name: 'Add', exact: true }).click();
	await expect
		.poll(async () => (await pool.query('SELECT id FROM todo WHERE title = $1', [title])).rowCount)
		.toBe(1);
	await expect(second.locator('ul li').filter({ hasText: title })).toHaveCount(1);
	const id = (await pool.query<{ id: string }>('SELECT id FROM todo WHERE title = $1', [title]))
		.rows[0].id;
	await page.locator('ul li').filter({ hasText: title }).getByRole('checkbox').check();
	await expect
		.poll(
			async () =>
				(await pool.query('SELECT completed FROM todo WHERE id = $1', [id])).rows[0].completed
		)
		.toBe(true);
	await expect(
		second.locator('ul li').filter({ hasText: title }).getByRole('checkbox')
	).toBeChecked();

	const renamed = `${prefix} changed directly in Postgres`;
	await pool.query('UPDATE todo SET title = $1 WHERE id = $2', [renamed, id]);
	await expect(page.locator('ul li').filter({ hasText: renamed })).toHaveCount(1);
	await expect(second.locator('ul li').filter({ hasText: renamed })).toHaveCount(1);
	await page.evaluate(
		async ({ demoURL, id }) => {
			const { z, mutators } = await import(demoURL);
			await z.mutate(mutators.todo.delete({ id })).server;
		},
		{ ...(await appModules(page)), id }
	);
	await expect
		.poll(async () => (await pool.query('SELECT id FROM todo WHERE id = $1', [id])).rowCount)
		.toBe(0);
	await expect(second.locator('ul li').filter({ hasText: renamed })).toHaveCount(0);
});

test('duplicate primary-key inserts succeed without overwriting the existing row', async ({
	page
}) => {
	await openDemo(page);
	await expect(page.locator('ul li').filter({ hasText: `${prefix} pending` })).toHaveCount(1);
	const result = await page.evaluate(
		async ({ demoURL, id, typeID, title }) => {
			const { z, mutators } = await import(demoURL);
			return await z.mutate(mutators.todo.insert({ id, title, completed: true, type_id: typeID }))
				.server;
		},
		{ ...(await appModules(page)), id: pendingID, typeID, title: `${prefix} must not overwrite` }
	);
	expect(result.type).toBe('success');
	const row = (await pool.query('SELECT title, completed FROM todo WHERE id = $1', [pendingID]))
		.rows[0];
	expect(row).toEqual({ title: `${prefix} pending`, completed: false });
});

test('offline optimistic mutations queue, then reach Postgres after automatic reconnect', async ({
	page,
	context
}) => {
	await openDemo(page);
	await expect(page.locator('ul li')).toHaveCount(await totalRows());
	await useIndexedDB(page, `${prefix}-offline-user`);
	await expect(page.locator('.connection-status')).toHaveText('Connected');
	await expect(page.locator('ul li')).toHaveCount(await totalRows());
	await context.setOffline(true);
	try {
		await expect(page.locator('.connection-status')).not.toHaveText('Connected', {
			timeout: 30_000
		});
		const id = `${prefix}-offline`;
		const title = `${prefix} offline write`;
		await page.evaluate(
			async ({ demoURL, id, title, typeID }) => {
				const { z, mutators } = await import(demoURL);
				await z.mutate(mutators.todo.insert({ id, title, completed: false, type_id: typeID }))
					.client;
			},
			{ ...(await appModules(page)), id, title, typeID }
		);
		await expect(page.locator('ul li').filter({ hasText: title })).toHaveCount(1);
		expect((await pool.query('SELECT id FROM todo WHERE id = $1', [id])).rowCount).toBe(0);
		await context.setOffline(false);
		await expect(page.locator('.connection-status')).toHaveText('Connected', { timeout: 30_000 });
		await expect
			.poll(async () => (await pool.query('SELECT id FROM todo WHERE id = $1', [id])).rowCount)
			.toBe(1);
	} finally {
		await context.setOffline(false);
	}
});

test('IndexedDB survives reload without sync and shared-group tabs keep all mutations', async ({
	page,
	context
}) => {
	let blockSync = false;
	await context.routeWebSocket('ws://localhost:4848/**', (socket) => {
		if (blockSync) socket.close();
		else socket.connectToServer();
	});
	await openDemo(page);
	const userID = `${prefix}-persisted-user`;
	await useIndexedDB(page, userID);
	await expect(page.locator('ul li')).toHaveCount(await totalRows());
	const second = await context.newPage();
	await openDemo(second);
	await useIndexedDB(second, userID);
	await expect(second.locator('ul li')).toHaveCount(await totalRows());
	const group = async (tab: Page): Promise<string> =>
		tab.evaluate(
			async (url) => {
				const { z } = await import(url);
				return await z.current.clientGroupID;
			},
			(await appModules(tab)).demoURL
		);
	expect(await group(page)).toBe(await group(second));

	await Promise.all(
		[page, second].map(async (tab, index) =>
			tab.evaluate(
				async ({ demoURL, prefix, typeID, index }) => {
					const { z, mutators } = await import(demoURL);
					for (let i = 0; i < 3; i++) {
						await z.mutate(
							mutators.todo.insert({
								id: `${prefix}-tab-${index}-${i}`,
								title: `${prefix} tab ${index} write ${i}`,
								completed: false,
								type_id: typeID
							})
						).server;
					}
				},
				{ ...(await appModules(tab)), prefix, typeID, index }
			)
		)
	);
	await expect
		.poll(
			async () =>
				(await pool.query('SELECT id FROM todo WHERE id LIKE $1', [`${prefix}-tab-%`])).rowCount
		)
		.toBe(6);
	await expect(page.locator('ul li').filter({ hasText: `${prefix} tab` })).toHaveCount(6);
	// Server acknowledgement and local persistence are different milestones.
	// Zero persists during idle time; wait for actual IndexedDB data, not a sleep.
	const ids = [0, 1].flatMap((tab) => [0, 1, 2].map((i) => `${prefix}-tab-${tab}-${i}`));
	await expect
		.poll(async () => {
			const storage = await context.storageState({ indexedDB: true });
			const persisted = JSON.stringify(
				storage.origins.map((origin) => ('indexedDB' in origin ? origin.indexedDB : []))
			);
			return ids.every((id) => persisted.includes(id));
		})
		.toBe(true);
	await second.close();

	// Keep HTTP available for the app reload, but refuse all NEW Zero WebSockets.
	blockSync = true;
	await page.reload();
	await useIndexedDB(page, userID);
	await expect(page.locator('ul li').filter({ hasText: `${prefix} tab` })).toHaveCount(6);
	await expect(page.locator('.connection-status')).not.toHaveText('Connected');
	expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBeGreaterThan(0);
	blockSync = false;
	await expect(page.locator('.connection-status')).toHaveText('Connected', { timeout: 30_000 });
});

test('rebuild closes the previous client and existing queries resume on the replacement', async ({
	page
}) => {
	await openDemo(page);
	await expect(page.locator('ul li')).toHaveCount(await totalRows());
	const result = await page.evaluate(
		async ({ demoURL, schemaURL, prefix }) => {
			const { z, mutators } = await import(demoURL);
			const { schema, queries } = await import(schemaURL);
			const previous = z.current;
			const query = z.q(queries.todo.all());
			z.build({
				schema,
				mutators,
				userID: `${prefix}-rebuilt`,
				cacheURL: 'http://localhost:4848',
				kvStore: 'mem'
			});
			const initialCount = query.data.length;
			try {
				const deadline = Date.now() + 20_000;
				while (query.details.type !== 'complete' && Date.now() < deadline) {
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
				return {
					initialCount,
					oldClosed: previous.closed,
					sameClient: previous === z.current,
					details: query.details.type,
					count: query.data.length
				};
			} finally {
				query.destroy();
			}
		},
		{ ...(await appModules(page)), prefix }
	);
	expect(result).toEqual({
		initialCount: 0,
		oldClosed: true,
		sameClient: false,
		details: 'complete',
		count: await totalRows()
	});
	await expect(page.locator('.connection-status')).toHaveText('Connected');
	await expect(page.locator('ul li')).toHaveCount(await totalRows());
});
