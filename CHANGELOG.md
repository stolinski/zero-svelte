# zero-svelte

## 0.5.0

### Minor Changes

- [#41](https://github.com/stolinski/zero-svelte/pull/41) [`2c6ce18`](https://github.com/stolinski/zero-svelte/commit/2c6ce18911492c2d1f235abb13cf4920a2b80f0c) Thanks [@stolinski](https://github.com/stolinski)! - - Fix: cache Svelte `z` context in `Query` constructor to avoid `getContext` usage outside component init (prevents `lifecycle_outside_component` errors).
  - Change: `Query.updateQuery(...)` now swaps the active view reactively. Changing the query hash or toggling `enabled` creates a new materialization; the previous one is cleaned up when no longer referenced (via `createSubscriber` cleanup). This yields predictable resubscribe/teardown across updates.

## 0.4.0

### Minor Changes

- [#34](https://github.com/stolinski/zero-svelte/pull/34) [`c9f4bd4`](https://github.com/stolinski/zero-svelte/commit/c9f4bd48bfd2f1187239bad3224136031811fc55) Thanks [@robert-wettstaedt](https://github.com/robert-wettstaedt)! - Adds support for synced queries and zero 0.23
