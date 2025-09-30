# zero-svelte – TODO

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
