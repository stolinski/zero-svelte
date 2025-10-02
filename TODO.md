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

## 6) Type/API polish (optional)

- Rationale: Improve DX and consistency.
- Ideas:
  - Consider a single state tuple `$state<QueryResult<TReturn>>` in `Query` to simplify updates.
  - Export `Query`, `Z`, and `viewStore` consistently from `src/lib/index.ts`.
  - Keep `enabled` as a cached property on `ViewWrapper` and allow toggling by creating a new `ViewWrapper` via `viewStore.getView()`.
