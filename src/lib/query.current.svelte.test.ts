import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QueryHost from '../../tests/harness/QueryHost.svelte';
import type { Query as QueryDef, Schema } from '@rocicorp/zero';
import { makeZStub } from '../../tests/harness/fakes.js';

function makeQuery<T>(opts: { singular?: boolean; hash?: string } = {}) {
	const singular = opts.singular ?? true;
	const hashVal = opts.hash ?? 'q1';
	return {
		format: { singular },
		hash() {
			return hashVal;
		}
	} as unknown as QueryDef<Schema, string & keyof Schema['tables'], T>;
}

describe('Query (current behavior)', () => {
	beforeEach(() => {
		// nothing for now
	});

	it('provides default snapshots before materialization emits (singular)', async () => {
		const stub = makeZStub();
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'A' });

		render(QueryHost, { props: { z: stub.z, query, enabled: true } });

		// Initially, default snapshot for singular is undefined + type unknown
		expect(await screen.findByTestId('data')).toHaveTextContent('undefined');
		expect(await screen.findByTestId('details')).toHaveTextContent('"unknown"');

		// Emit a value from the typed view after materialization occurred
		stub.last.emit({ id: 1 }, 'complete');

		expect(await screen.findByTestId('data')).toHaveTextContent('{"id":1}');
		expect(await screen.findByTestId('details')).toHaveTextContent('"complete"');
	});

	it('provides default snapshots before materialization emits (plural)', async () => {
		const stub = makeZStub();
		const query = makeQuery<Array<{ id: number }>>({ singular: false, hash: 'B' });

		render(QueryHost, { props: { z: stub.z, query, enabled: true } });

		// Initially, default snapshot for plural is [] + type unknown
		expect(await screen.findByTestId('data')).toHaveTextContent('[]');
		expect(await screen.findByTestId('details')).toHaveTextContent('"unknown"');

		// Emit a value from the typed view after materialization
		stub.last.emit([{ id: 2 }], 'complete');

		expect(await screen.findByTestId('data')).toHaveTextContent('[{"id":2}]');
		expect(await screen.findByTestId('details')).toHaveTextContent('"complete"');
	});

	it('reuses a single materialization across two hosts (same userID + hash, enabled=true)', async () => {
		const stub = makeZStub({ userID: 'user-1' });
		const q1 = makeQuery<{ id: number }>({ singular: true, hash: 'H' });
		const q2 = makeQuery<{ id: number }>({ singular: true, hash: 'H' });

		render(QueryHost, { props: { z: stub.z, query: q1, enabled: true } });
		render(QueryHost, { props: { z: stub.z, query: q2, enabled: true } });

		expect(stub.created.length).toBe(1);
	});

	it('creates separate materializations for different users (same hash, enabled=true)', async () => {
		const stub1 = makeZStub({ userID: 'u1' });
		const stub2 = makeZStub({ userID: 'u2' });
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'Hsame' });

		render(QueryHost, { props: { z: stub1.z, query, enabled: true } });
		render(QueryHost, { props: { z: stub2.z, query, enabled: true } });

		expect(stub1.created.length).toBe(1);
		expect(stub2.created.length).toBe(1);
	});

	it('does not materialize when enabled=false', async () => {
		const stub = makeZStub({ userID: 'user-2' });
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'H2' });

		render(QueryHost, { props: { z: stub.z, query, enabled: false } });
		render(QueryHost, { props: { z: stub.z, query, enabled: false } });

		// Disabled queries should not materialize at all
		expect(stub.created.length).toBe(0);
	});

	it('emitted objects are passed through (snapshots are immutable); mutating source does not affect current', async () => {
		const stub = makeZStub();
		const query = makeQuery<{ nested: { count: number } }>({ singular: true, hash: 'C' });

		render(QueryHost, { props: { z: stub.z, query, enabled: true } });

		const obj: { nested: { count: number } } = { nested: { count: 1 } };
		stub.last.emit(obj, 'complete');
		// Mutate the original after emission; snapshot should be unaffected
		obj.nested.count = 999;

		const dataEl = await screen.findByTestId('data');
		expect(dataEl).toHaveTextContent('"count":1');
	});

	it('destroys the view on unmount (single host)', async () => {
		const stub = makeZStub();
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'L1' });

		const { unmount } = render(QueryHost, { props: { z: stub.z, query, enabled: true } });

		expect(stub.created.length).toBe(1);
		const tv1 = stub.created[0].tv;
		// Unmount host component
		unmount();
		// allow cleanup microtask
		await Promise.resolve();
		expect(tv1.destroyed).toBe(true);
	});

	it('shared view persists until last host unmounts', async () => {
		const stub = makeZStub({ userID: 'user-shared' });
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'L2' });

		const r1 = render(QueryHost, { props: { z: stub.z, query, enabled: true } });
		const r2 = render(QueryHost, { props: { z: stub.z, query, enabled: true } });

		expect(stub.created.length).toBe(1);
		const tv = stub.created[0].tv;

		// Unmount only one host; shared view should remain
		r1.unmount();
		await Promise.resolve();
		expect(tv.destroyed).toBe(false);

		// Unmount second host; now view should be destroyed
		r2.unmount();
		await Promise.resolve();
		expect(tv.destroyed).toBe(true);
	});

	it('updateQuery with same hash reuses existing materialization', async () => {
		const stub = makeZStub();
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'U1' });

		let update:
			| ((q: QueryDef<Schema, string & keyof Schema['tables'], unknown>, enabled?: boolean) => void)
			| undefined;
		render(QueryHost, {
			props: {
				z: stub.z,
				query,
				enabled: true,
				register: (api: {
					updateQuery: (
						q: QueryDef<Schema, string & keyof Schema['tables'], unknown>,
						enabled?: boolean
					) => void;
					z: unknown;
				}) => (update = api.updateQuery)
			}
		});

		expect(stub.created.length).toBe(1);
		const same = makeQuery<{ id: number }>({ singular: true, hash: 'U1' });
		update!(same, true);
		await Promise.resolve();
		expect(stub.created.length).toBe(1);
	});

	it('updateQuery with new hash creates new materialization and destroys old', async () => {
		const stub = makeZStub();
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'U2' });

		let update:
			| ((q: QueryDef<Schema, string & keyof Schema['tables'], unknown>, enabled?: boolean) => void)
			| undefined;
		render(QueryHost, {
			props: {
				z: stub.z,
				query,
				enabled: true,
				register: (api: {
					updateQuery: (
						q: QueryDef<Schema, string & keyof Schema['tables'], unknown>,
						enabled?: boolean
					) => void;
					z: unknown;
				}) => (update = api.updateQuery)
			}
		});

		expect(stub.created.length).toBe(1);
		const oldTv = stub.created[0].tv;

		const next = makeQuery<{ id: number }>({ singular: true, hash: 'U3' });
		update!(next, true);
		await Promise.resolve();

		expect(stub.created.length).toBe(2);
		expect(oldTv.destroyed).toBe(true);
	});

	it('toggle enabled false/true switches between disabled and shared views', async () => {
		const stub = makeZStub();
		const query = makeQuery<{ id: number }>({ singular: true, hash: 'T1' });

		let update:
			| ((q: QueryDef<Schema, string & keyof Schema['tables'], unknown>, enabled?: boolean) => void)
			| undefined;
		render(QueryHost, {
			props: {
				z: stub.z,
				query,
				enabled: true,
				register: (api: {
					updateQuery: (
						q: QueryDef<Schema, string & keyof Schema['tables'], unknown>,
						enabled?: boolean
					) => void;
					z: unknown;
				}) => (update = api.updateQuery)
			}
		});

		// Initial shared view
		expect(stub.created.length).toBe(1);
		const sharedTv = stub.created[0].tv;

		// Disable materialization
		update!(query, false);
		await Promise.resolve();
		// No new materialization when disabled
		expect(stub.created.length).toBe(1);
		expect(sharedTv.destroyed).toBe(true);

		// Re-enable sharing (new shared view)
		update!(query, true);
		await Promise.resolve();
		expect(stub.created.length).toBe(2);
		expect(stub.created[1].tv.destroyed).toBe(false);
	});

	// Additional coverage for #2 (re-subscription behavior)
	it('re-subscribes after updateQuery with new hash: new emissions update DOM', async () => {
		const stub = makeZStub();
		const q1 = makeQuery<{ id: number }>({ singular: true, hash: 'RS-1' });

		let update:
			| ((q: QueryDef<Schema, string & keyof Schema['tables'], unknown>, enabled?: boolean) => void)
			| undefined;
		render(QueryHost, {
			props: {
				z: stub.z,
				query: q1,
				enabled: true,
				register: (api: {
					updateQuery: (
						q: QueryDef<Schema, string & keyof Schema['tables'], unknown>,
						enabled?: boolean
					) => void;
					z: unknown;
				}) => (update = api.updateQuery)
			}
		});

		// Emit initial value from first view
		stub.last.emit({ id: 1 }, 'complete');
		expect(await screen.findByTestId('data')).toHaveTextContent('{"id":1}');

		// Switch to a new query (new hash -> new view)
		const q2 = makeQuery<{ id: number }>({ singular: true, hash: 'RS-2' });
		update!(q2, true);
		await Promise.resolve();

		// Emit from the new view and verify DOM updates
		stub.last.emit({ id: 2 }, 'complete');
		expect(await screen.findByTestId('data')).toHaveTextContent('{"id":2}');
	});

	it('keeps subscription when updating with same hash: emissions still update DOM', async () => {
		const stub = makeZStub();
		const q1 = makeQuery<{ id: number }>({ singular: true, hash: 'RS-SAME' });

		let update:
			| ((q: QueryDef<Schema, string & keyof Schema['tables'], unknown>, enabled?: boolean) => void)
			| undefined;
		render(QueryHost, {
			props: {
				z: stub.z,
				query: q1,
				enabled: true,
				register: (api: {
					updateQuery: (
						q: QueryDef<Schema, string & keyof Schema['tables'], unknown>,
						enabled?: boolean
					) => void;
					z: unknown;
				}) => (update = api.updateQuery)
			}
		});

		// Emit initial value
		stub.last.emit({ id: 10 }, 'complete');
		expect(await screen.findByTestId('data')).toHaveTextContent('{"id":10}');

		// Update with a different object but same hash (reuse view)
		const qSame = makeQuery<{ id: number }>({ singular: true, hash: 'RS-SAME' });
		update!(qSame, true);
		await Promise.resolve();

		// Emit again; should still update the DOM
		stub.last.emit({ id: 11 }, 'complete');
		expect(await screen.findByTestId('data')).toHaveTextContent('{"id":11}');
	});
});
