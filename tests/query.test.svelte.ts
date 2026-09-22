import { defineQueries, defineQuery, type TypedView } from '@rocicorp/zero';
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Query, Z } from 'zero-svelte';
import QueryOwner from './fixtures/QueryOwner.svelte';
import { mutators, queries, schema, zql } from './schema.js';

const clients: Z<typeof schema>[] = [];
const owners: ReturnType<typeof mount>[] = [];
const manualQueries: { destroy: () => void }[] = [];

function createClient(userID = 'alice'): Z<typeof schema> {
	const z = new Z<typeof schema>({
		schema,
		mutators,
		userID,
		context: { userID },
		cacheURL: null,
		kvStore: 'mem'
	});
	clients.push(z);
	return z;
}

function own(setup: () => void): ReturnType<typeof mount> {
	const owner = mount(QueryOwner, { target: document.body, props: { setup } });
	owners.push(owner);
	return owner;
}

async function settle(): Promise<void> {
	flushSync();
	await tick();
	await tick();
	flushSync();
}

function observeViews(z: Z<typeof schema>) {
	const views: { view: TypedView<unknown>; destroy: ReturnType<typeof vi.spyOn> }[] = [];
	const materialize = z.current.materialize.bind(z.current);
	const spy = vi.spyOn(z.current, 'materialize').mockImplementation((query) => {
		const view = materialize(query);
		views.push({ view, destroy: vi.spyOn(view, 'destroy') });
		return view;
	});
	return { views, spy };
}

afterEach(async () => {
	for (const owner of owners.splice(0)) await unmount(owner);
	for (const query of manualQueries.splice(0)) query.destroy();
	await settle();
	for (const z of clients.splice(0)) {
		const close = vi.spyOn(z.current, 'close');
		z.close();
		await close.mock.results.at(-1)?.value;
	}
	vi.restoreAllMocks();
	document.body.replaceChildren();
});

describe('query compatibility', () => {
	it('keeps an unread background query alive until its component unmounts', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const owner = own(() => {
			z.createQuery(zql.todo);
		});
		await settle();
		expect(views).toHaveLength(1);
		expect(views[0].destroy).not.toHaveBeenCalled();
		await unmount(owner);
		owners.splice(owners.indexOf(owner), 1);
		await settle();
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
	});

	it('releases replaced derived queries without losing reactive data', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'first', owner: 'alice' });
		await z.mutate.todo.insert({ id: '2', title: 'second', owner: 'alice' });
		const { views } = observeViews(z);
		let id = $state('1');
		let title = '';
		own(() => {
			const query = $derived(z.q(zql.todo.where('id', id).one()));
			$effect(() => {
				title = query.data?.title ?? '';
			});
		});
		await settle();
		expect(title).toBe('first');
		id = '2';
		await settle();
		expect(title).toBe('second');
		expect(views).toHaveLength(2);
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
		expect(views[1].destroy).not.toHaveBeenCalled();
	});

	it('shares equal queries until the last owner is removed', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const first = own(() => {
			z.q(zql.todo);
		});
		const second = own(() => {
			z.q(zql.todo);
		});
		await settle();
		expect(views).toHaveLength(1);
		await unmount(first);
		owners.splice(owners.indexOf(first), 1);
		await settle();
		expect(views[0].destroy).not.toHaveBeenCalled();
		await unmount(second);
		owners.splice(owners.indexOf(second), 1);
		await settle();
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
	});

	it('does not let a local query suppress a later server subscription with the same AST', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const local = z.q(zql.todo);
		// Match initial rendering: read the local view before the background effect starts.
		void local.data;
		const synced = z.q(queries.all());
		const duplicate = z.q(queries.all());
		manualQueries.push(local, synced, duplicate);
		await settle();
		expect(views).toHaveLength(2);
		expect(local.view).not.toBe(synced.view);
		expect(duplicate.view).toBe(synced.view);
	});

	it('keeps different named server queries separate even when their ASTs match', async () => {
		const z = createClient();
		const named = defineQueries({
			first: defineQuery(() => zql.todo),
			second: defineQuery(() => zql.todo)
		});
		const first = z.q(named.first());
		const second = z.q(named.second());
		manualQueries.push(first, second);
		await settle();
		expect(first.view).not.toBe(second.view);
	});

	it('does not share singular and plural views of the same query AST', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'first', owner: 'alice' });
		const list = z.q(zql.todo.limit(1));
		const single = z.q(zql.todo.one());
		manualQueries.push(list, single);
		await settle();
		expect(list.data).toMatchObject([{ id: '1', title: 'first', owner: 'alice' }]);
		expect(single.data).toMatchObject({ id: '1', title: 'first', owner: 'alice' });
		expect(list.view).not.toBe(single.view);
	});

	it('includes nested relationship formats in the cache identity', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'first', owner: 'alice' });
		const list = z.q(zql.todo.related('siblings', (q) => q.limit(1)).one());
		const single = z.q(zql.todo.related('siblings', (q) => q.one()).one());
		manualQueries.push(list, single);
		await settle();
		expect(list.data?.siblings).toMatchObject([{ id: '1' }]);
		expect(single.data?.siblings).toMatchObject({ id: '1' });
		expect(list.view).not.toBe(single.view);
	});

	it('supports disabled queries, updateQuery, and repeated manual destruction', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const query = new Query(zql.todo, z, false);
		manualQueries.push(query);
		await settle();
		expect(query.data).toEqual([]);
		expect(query.details).toEqual({ type: 'unknown' });
		expect(views).toHaveLength(0);
		query.updateQuery(zql.todo, true);
		await settle();
		expect(views).toHaveLength(1);
		query.updateQuery(zql.todo, false);
		await settle();
		expect(query.data).toEqual([]);
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
		query.updateQuery(zql.todo, true);
		await settle();
		query.destroy();
		query.destroy();
		await settle();
		expect(views[1].destroy).toHaveBeenCalledTimes(1);
	});

	it('passes context to updated query requests', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'mine', owner: 'alice' });
		await z.mutate.todo.insert({ id: '2', title: 'theirs', owner: 'bob' });
		const query = z.q(queries.all());
		manualQueries.push(query);
		await settle();
		expect(query.data).toHaveLength(2);
		query.updateQuery(queries.mine());
		await settle();
		expect(query.data.map((row) => row.id)).toEqual(['1']);
	});

	it('closes the previous client and rebinds existing queries after build', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'alice private', owner: 'alice' });
		const query = z.q(queries.mine());
		manualQueries.push(query);
		await settle();
		expect(query.data.map((row) => row.id)).toEqual(['1']);
		const previous = z.current;
		const close = vi.spyOn(previous, 'close');
		const { views } = observeViews(z);
		const raw = z.q(zql.todo);
		manualQueries.push(raw);
		await settle();
		z.build({ schema, userID: 'bob', context: { userID: 'bob' }, cacheURL: null, kvStore: 'mem' });
		expect(close).toHaveBeenCalledTimes(1);
		expect(query.data).toEqual([]);
		await settle();
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
		await z.mutate.todo.insert({ id: '2', title: 'bob private', owner: 'bob' });
		await settle();
		expect(query.data.map((row) => row.id)).toEqual(['2']);
		expect(raw.data.map((row) => row.id)).toEqual(['2']);
		await close.mock.results[0].value;
	});

	it('forwards defined mutators and legacy batches without changing their results', async () => {
		const z = createClient();
		const result = z.mutate(mutators.insert({ id: '1', title: 'defined', owner: 'alice' }));
		expect(result.client).toBeInstanceOf(Promise);
		expect(result.server).toBeInstanceOf(Promise);
		await result.client;
		await z.mutateBatch(async (tx) => {
			await tx.todo.update({ id: '1', title: 'batched' });
		});
		expect((await z.run(zql.todo.one()))?.title).toBe('batched');
	});

	it('preserves forwarding methods and deprecated accessors', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'mine', owner: 'alice' });
		expect(await z.run(queries.mine())).toMatchObject([{ id: '1', title: 'mine', owner: 'alice' }]);
		const view = z.materialize(queries.mine());
		expect(view.data).toHaveLength(1);
		view.destroy();
		const preload = z.preload(queries.mine(), { ttl: '1m' });
		expect(preload.complete).toBeInstanceOf(Promise);
		preload.cleanup();
		const query = z.createQuery(zql.todo);
		manualQueries.push(query);
		await settle();
		expect(query.current).toEqual(query.data);
		expect(query.view?.current[0]).toEqual(query.data);
		expect(z.userID).toBe('alice');
		expect(z.clientID).toBe(z.current.clientID);
		expect(z.connection).toBe(z.current.connection);
		expect(z.mutateBatch).toBe(z.current.mutateBatch);
		expect(z.online).toBe(z.connectionState.name === 'connected');
	});

	it('reacts to later mutations without recreating the materialized view', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const query = z.q(zql.todo.one());
		manualQueries.push(query);
		let title = '';
		own(() => {
			$effect(() => {
				title = query.data?.title ?? '';
			});
		});
		await settle();
		expect(query.data).toBeUndefined();
		await z.mutate.todo.insert({ id: '1', title: 'first', owner: 'alice' });
		await settle();
		expect(title).toBe('first');
		await z.mutate.todo.update({ id: '1', title: 'changed' });
		await settle();
		expect(title).toBe('changed');
		expect(views).toHaveLength(1);
	});

	it('supports derived enabled flags and cleans up repeated filter changes', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		let enabled = $state(false);
		let id = $state('0');
		own(() => {
			const query = $derived(z.q(zql.todo.where('id', id).one(), enabled));
			$effect(() => {
				void query.details;
			});
		});
		await settle();
		expect(views).toHaveLength(0);
		enabled = true;
		await settle();
		for (let i = 1; i <= 10; i++) {
			id = String(i);
			await settle();
		}
		expect(views).toHaveLength(11);
		expect(views.filter(({ destroy }) => destroy.mock.calls.length === 0)).toHaveLength(1);
		enabled = false;
		await settle();
		expect(views.every(({ destroy }) => destroy.mock.calls.length === 1)).toBe(true);
	});

	it('does not start an owned query destroyed before the first effect flush', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		own(() => {
			z.q(zql.todo).destroy();
		});
		await settle();
		expect(views).toHaveLength(0);
	});

	it('cleans queries owned by an explicit effect root', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const dispose = $effect.root(() => {
			z.q(zql.todo);
		});
		await settle();
		expect(views).toHaveLength(1);
		dispose();
		await settle();
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
	});

	it('validates updates synchronously and leaves the previous query intact on error', async () => {
		const z = createClient();
		await z.mutate.todo.insert({ id: '1', title: 'mine', owner: 'alice' });
		const query = z.q(zql.todo);
		manualQueries.push(query);
		await settle();
		const invalid = defineQueries({
			query: defineQuery((): typeof zql.todo => {
				throw new Error('invalid query');
			})
		});
		expect(() => query.updateQuery(invalid.query())).toThrow('invalid query');
		expect(() => z.q(invalid.query())).toThrow('invalid query');
		await settle();
		expect(query.data.map((row) => row.id)).toEqual(['1']);
	});

	it('invalidates active views on close without double-destroying them', async () => {
		const z = createClient();
		const { views } = observeViews(z);
		const query = z.q(zql.todo);
		manualQueries.push(query);
		await settle();
		const close = vi.spyOn(z.current, 'close');
		z.close();
		z.close();
		expect(close).toHaveBeenCalledTimes(1);
		expect(query.data).toEqual([]);
		expect(z.connectionState.name).toBe('closed');
		expect(z.online).toBe(false);
		query.destroy();
		await settle();
		expect(views[0].destroy).toHaveBeenCalledTimes(1);
		await close.mock.results[0].value;
	});

	it('keeps the working client when replacement options are invalid', async () => {
		const z = createClient();
		const previous = z.current;
		const close = vi.spyOn(previous, 'close');
		expect(() =>
			z.build({ schema, context: { userID: 'bob' }, cacheURL: 'invalid url' })
		).toThrow();
		expect(z.current).toBe(previous);
		expect(close).not.toHaveBeenCalled();
	});
});
