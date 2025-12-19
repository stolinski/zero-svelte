---
'zero-svelte': patch
---

Fix preload(), run(), and materialize() methods to work with synced queries from defineQuery()

These methods now correctly resolve synced queries using addContextToQuery() before passing to the underlying Zero instance, matching the behavior of createQuery(). Previously, passing a query created with defineQuery() to these methods would fail with "query[delegateSymbol] is not a function".
