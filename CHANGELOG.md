# zero-svelte

## 0.8.0

### Minor Changes

- [#46](https://github.com/stolinski/zero-svelte/pull/46) [`be0e65f`](https://github.com/stolinski/zero-svelte/commit/be0e65f5e303ffd79586430dac8565ec194c639b) Thanks [@stolinski](https://github.com/stolinski)! - Adds online property for when the sync is online

## 0.7.0

### Minor Changes

- [#45](https://github.com/stolinski/zero-svelte/pull/45) [`0727c46`](https://github.com/stolinski/zero-svelte/commit/0727c46e7ce3363e29ee190cc5fcff7b04ad6bf3) Thanks [@stolinski](https://github.com/stolinski)! - Add getter proxies to Z class for cleaner API

  Users can now access Zero instance methods directly via `z.query`, `z.mutate`, `z.clientID`, and `z.userID` instead of `z.current.query`, `z.current.mutate`, etc.

  The `.current` property remains available for backward compatibility.

  **Before:**

  ```typescript
  const todos = new Query(z.current.query.todo);
  z.current.mutate.todo.insert({ id, title, completed: false });
  ```

  **After:**

  ```typescript
  const todos = new Query(z.query.todo);
  z.mutate.todo.insert({ id, title, completed: false });
  ```

  This improves the developer experience while maintaining full reactivity when swapping Zero instances via `z.build()`.

## 0.6.2

### Patch Changes

- [#44](https://github.com/stolinski/zero-svelte/pull/44) [`d590074`](https://github.com/stolinski/zero-svelte/commit/d59007479d137aff1e2abf98b03462ae7bcf363d) Thanks [@stolinski](https://github.com/stolinski)! - Use clientID instead of userID for query hash calculation

## 0.6.1

### Patch Changes

- [#43](https://github.com/stolinski/zero-svelte/pull/43) [`5747e0a`](https://github.com/stolinski/zero-svelte/commit/5747e0ad59de4a4b462892b54544d3874d986297) Thanks [@stolinski](https://github.com/stolinski)! - Avoid deep cloning Zero snapshots in the Query listener and remove the internal `Immutable` type import. Trust Zero’s deep-frozen snapshots and keep reactivity by replacing the container object and calling `notify()`. This improves performance (CPU/GC) without changing the public API.

## 0.6.0

### Minor Changes

- [#42](https://github.com/stolinski/zero-svelte/pull/42) [`99249a4`](https://github.com/stolinski/zero-svelte/commit/99249a4288db616e2c108015346aa38c18760e60) Thanks [@stolinski](https://github.com/stolinski)! - Add optional `enabled` flag to `Query` API to gate materialization.
  - `new Query(query, enabled = true)` and `query.updateQuery(query, enabled = true)` now accept an `enabled` boolean.
  - When `enabled` is `false`, the query does not materialize or register listeners; `current` exposes the default snapshot (`undefined` for singular, `[]` for plural) with details `{ type: 'unknown' }` until re-enabled.
  - When re-enabled (`true`), materialization begins and snapshots update as data arrives.
  - Default remains `true`, so existing code continues to work unchanged.

  Notes
  - View sharing behavior is unchanged: materializations are still keyed by `query.hash()` plus `userID`.
  - This is a backwards-compatible enhancement intended for conditional loading (e.g., route guards, feature toggles).

## 0.5.0

### Minor Changes

- [#41](https://github.com/stolinski/zero-svelte/pull/41) [`2c6ce18`](https://github.com/stolinski/zero-svelte/commit/2c6ce18911492c2d1f235abb13cf4920a2b80f0c) Thanks [@stolinski](https://github.com/stolinski)! - - Fix: cache Svelte `z` context in `Query` constructor to avoid `getContext` usage outside component init (prevents `lifecycle_outside_component` errors).
  - Change: `Query.updateQuery(...)` now swaps the active view reactively. Changing the query hash or toggling `enabled` creates a new materialization; the previous one is cleaned up when no longer referenced (via `createSubscriber` cleanup). This yields predictable resubscribe/teardown across updates.

## 0.4.0

### Minor Changes

- [#34](https://github.com/stolinski/zero-svelte/pull/34) [`c9f4bd4`](https://github.com/stolinski/zero-svelte/commit/c9f4bd48bfd2f1187239bad3224136031811fc55) Thanks [@robert-wettstaedt](https://github.com/robert-wettstaedt)! - Adds support for synced queries and zero 0.23
