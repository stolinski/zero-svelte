---
'zero-svelte': major
---

Update for `@rocicorp/zero` 1.x. The `Z`, `Query`, `ViewStore`, and `ViewWrapper`
generic constraints now use `BaseDefaultSchema` / `BaseDefaultContext` (matching
the new `Zero<S, MD, C>` signature) and a third `TContext` generic threads the
caller's context type end-to-end. `Z#userID` returns `string | undefined` to
match the underlying client.
