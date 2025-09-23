---
'zero-svelte': patch
---

Avoid deep cloning Zero snapshots in the Query listener and remove the internal `Immutable` type import. Trust Zero’s deep-frozen snapshots and keep reactivity by replacing the container object and calling `notify()`. This improves performance (CPU/GC) without changing the public API.
