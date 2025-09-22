---
'zero-svelte': minor
---

Add optional `enabled` flag to `Query` API to gate materialization.

- `new Query(query, enabled = true)` and `query.updateQuery(query, enabled = true)` now accept an `enabled` boolean.
- When `enabled` is `false`, the query does not materialize or register listeners; `current` exposes the default snapshot (`undefined` for singular, `[]` for plural) with details `{ type: 'unknown' }` until re-enabled.
- When re-enabled (`true`), materialization begins and snapshots update as data arrives.
- Default remains `true`, so existing code continues to work unchanged.

Notes

- View sharing behavior is unchanged: materializations are still keyed by `query.hash()` plus `userID`.
- This is a backwards-compatible enhancement intended for conditional loading (e.g., route guards, feature toggles).
