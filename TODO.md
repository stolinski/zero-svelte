# zero-svelte – TODO

This plan captures the next implementation steps based on prior findings. Each item includes rationale and concrete guidance.

## 1) Enabled gating for queries

- Rationale: `enabled=false` should avoid materialization, network, and listeners.
- Approach:
  - Add an `enabled` flag to `ViewWrapper` and guard `#materializeIfNeeded()` so it’s a no-op when disabled.
  - Ensure `Query` constructor and `updateQuery()` pass the flag and expose default `unknown` snapshot until enabled.
- Snippet (conceptual):

```ts
class ViewWrapper<...> {
  constructor(..., private enabled: boolean) {}
  #materializeIfNeeded() {
    if (!this.enabled) return; // don’t materialize
    if (!this.#view) { this.#view = this.z.current.materialize(this.query); ... }
  }
}
```

## 2) Re-subscription on query change

- Rationale: `updateQuery()` currently replaces the wrapper but the reactive effect only pins to the previous `#view`; ensure the effect tracks the new one or provide guidance to recreate `Query`.
- Approach:
  - Keep the effect but reference `this.#view.current` inside so Svelte picks up the dependency.
  - Alternatively, recommend replacing the `Query` instance instead of `updateQuery` for clarity.
- Snippet:

```ts
$effect(() => {
	const view = this.#view; // dependency
	if (view) {
		const [data, details] = view.current;
		this.current = data;
		this.details = details;
	}
});
```

## 3) Remove internal `Immutable` import and avoid cloning

- Rationale: Importing from Zero internals is brittle and `structuredClone` on every update is unnecessary and can be expensive.
- Approach:
  - Use only public types (`HumanReadable`, `ReadonlyJSONValue`).
  - Pass snapshots through directly; they are already frozen/human readable via Zero.
- Snippet:

```ts
#onData = (snap: HumanReadable<TReturn> | undefined, resultType: ResultType) => {
	this.#data = { '': snap as HumanReadable<TReturn> };
	this.#status = { type: resultType };
};
```

## 4) Context symbol + SSR guard

- Rationale: Avoid context key collisions; prevent instantiation during SSR when not desired.
- Approach:
  - Export a `ZContextKey = Symbol('z')` from `Z.svelte.ts` and use `setContext(ZContextKey, z)` / `getContext(ZContextKey)`.
  - Optionally guard `new Zero(...)` with a browser check if SSR safety is required by the app.
- Snippet:

```ts
export const ZContextKey = Symbol('z');
setContext(ZContextKey, this);
// getContext(ZContextKey)
```

## 5) Error message and user-id hashing

- Rationale: Current error is vague; include query hash + user for clarity.
- Approach:
  - When throwing duplicate view errors, include `hash` and `id`.
- Snippet:

```ts
throw new Error(`View already exists for hash=${hash} user=${id}`);
```

## 6) Type/API polish (optional)

- Rationale: Improve DX and consistency.
- Ideas:
  - Consider a single state tuple `$state<QueryResult<TReturn>>` in `Query` to simplify updates.
  - Export `Query`, `Z`, and `viewStore` consistently from `src/lib/index.ts`.
  - Keep `enabled` as a cached property on `ViewWrapper` and allow toggling by creating a new `ViewWrapper` via `viewStore.getView()`.

## Implementation order

1. Enabled gating (no materialize when disabled)
2. Remove internal import and drop cloning
3. Re-subscription fix / semantics
4. Context symbol + SSR guard (if desired)
5. Error message improvement

## Post-change checks

- Disabled queries do not open views nor register listeners.
- Updating the query updates the subscription without leaks.
- No import from Zero internals remains; no runtime cloning in onData.
- Context symbol works across components; no runtime warnings in SSR.
- Types remain stable for `QueryResult<TReturn>` consumers.
