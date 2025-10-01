---
'zero-svelte': minor
---

Add getter proxies to Z class for cleaner API

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
