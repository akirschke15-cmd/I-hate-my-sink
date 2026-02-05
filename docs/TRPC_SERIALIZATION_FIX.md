# tRPC v11 Serialization Error - Root Cause Analysis

**Date**: 2026-02-05
**Time to Resolve**: ~2 hours
**Severity**: Critical (blocked all authentication)

---

## Symptom

```
"expected": "object", "received": "undefined"
```

Users could not log in. The server received `undefined` instead of `{ email, password }`.

---

## Root Cause: tRPC v11 Breaking Change

**In tRPC v11, the transformer must be configured INSIDE `httpBatchLink`, NOT at the client level.**

| tRPC Version | Transformer Location |
|--------------|---------------------|
| v10 | At `createClient()` level |
| **v11** | **Inside `httpBatchLink()`** |

---

## The Bug

**Client** (`apps/web/src/lib/trpc.ts`) - WRONG (v10 style):
```typescript
import SuperJSON from 'superjson';

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        headers() { ... }
      }),
    ],
    transformer: SuperJSON,  // ❌ WRONG - v10 style, ignored in v11
  });
}
```

---

## The Fix

**Client** (`apps/web/src/lib/trpc.ts`) - CORRECT (v11 style):
```typescript
import SuperJSON from 'superjson';

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        transformer: SuperJSON,  // ✅ CORRECT - inside the link
        headers() { ... }
      }),
    ],
  });
}
```

**Server** (`packages/api/src/trpc.ts`) - remains the same:
```typescript
import SuperJSON from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
});
```

---

## Why This Was Hard to Debug

1. **No TypeScript error** - Both placements are valid TypeScript
2. **No runtime error on client** - Just silently didn't serialize
3. **Vague server error** - "expected object, received undefined" doesn't mention transformer
4. **v10 → v11 migration** - Easy to miss this breaking change
5. **Multiple clients** - OfflineContext.tsx also needed fixing

---

## Files Fixed

| File | Change |
|------|--------|
| `apps/web/src/lib/trpc.ts` | Moved transformer inside httpBatchLink |
| `apps/web/src/contexts/OfflineContext.tsx` | Moved transformer inside httpBatchLink |
| `packages/api/src/trpc.ts` | Server config (already correct) |

---

## Prevention Checklist

- [ ] When using tRPC v11+, ALWAYS put transformer inside httpBatchLink
- [ ] Check ALL tRPC clients in codebase (main + OfflineContext + any others)
- [ ] After tRPC version upgrades, check migration guide for breaking changes
- [ ] Test login flow after any tRPC/transformer changes

---

## Related Documentation

- [tRPC v11 Migration Guide](https://trpc.io/docs/migrate-from-v10-to-v11)
- [tRPC Data Transformers](https://trpc.io/docs/server/data-transformers)
- [SuperJSON GitHub](https://github.com/blitz-js/superjson)
