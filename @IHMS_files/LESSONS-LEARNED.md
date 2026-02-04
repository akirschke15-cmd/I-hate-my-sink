# Lessons Learned - IHMS Development

This document captures key lessons learned during development to prevent recurring issues.

---

## 1. TypeScript Project References and Declaration Files

### Problem
After adding a `version` column to database schema files (`customers.ts`, `measurements.ts`, `quotes.ts`), TypeScript reported errors like:
```
Property 'version' does not exist on type '{ id: string; ... }'
```

The source files were correct, but TypeScript couldn't see the new column.

### Root Cause
The monorepo uses **TypeScript project references** with `composite: true` and `emitDeclarationOnly: true` in `packages/db/tsconfig.json`. This means:
- The `db` package emits `.d.ts` declaration files to `packages/db/dist/`
- The `api` package has `"references": [{ "path": "../db" }]` in its tsconfig
- Dependent packages resolve types from compiled declarations, NOT source `.ts` files
- When source files change, the `dist/*.d.ts` files become stale

### Solution
After modifying any schema file in `packages/db/src/schema/`:
```bash
# IMPORTANT: Must use --build flag for composite projects
# Plain 'npx tsc' does NOT create the dist folder
cd packages/db && npx tsc --build
```

Then clear turbo cache and re-typecheck:
```bash
rm -rf .turbo && pnpm typecheck
```

### Key Details
- The db package has **NO build script** - `pnpm --filter @ihms/db build` will fail
- Must use `npx tsc --build` directly (not `npx tsc`)
- For a clean rebuild, also remove `tsconfig.tsbuildinfo`:
  ```bash
  cd packages/db && rm -f tsconfig.tsbuildinfo && npx tsc --build
  ```

---

## 2. Local vs Shared Zod Schemas

### Problem
Adding a `version` column to the database schema caused errors when a router tried to destructure `version` from input:
```typescript
const { id, version, ...updateData } = input; // Error: 'version' doesn't exist on input type
```

### Root Cause
There are TWO types of Zod schemas in this codebase:
- **Shared schemas**: `packages/shared/src/schemas/*.ts` - Already had `version` field
- **Local schemas**: Defined inline in router files (e.g., `measurement.ts`) - Did NOT have `version` field

The `updateMeasurementSchema` was defined locally in `packages/api/src/routers/measurement.ts` and wasn't updated when the database schema changed.

### Solution
When adding fields like `version` for optimistic concurrency:

1. **Check shared schemas first** - `packages/shared/src/schemas/`
   - `customer.ts` line 22 - `updateCustomerSchema` already had `version`
   - `quote.ts` line 32 - `updateQuoteSchema` already had `version`

2. **Search for LOCAL schemas in router files**
   - `packages/api/src/routers/measurement.ts` had a LOCAL `updateMeasurementSchema` that needed updating:
   ```typescript
   const updateMeasurementSchema = createMeasurementSchema.partial().extend({
     id: z.string().uuid(),
     version: z.number().int().positive().optional(), // ADD THIS
   });
   ```

### Prevention
- Search codebase for all schema definitions: `grep -r "Schema = " packages/`
- Prefer shared schemas over local schemas when possible
- Consider consolidating local schemas into the shared package

---

## 3. Turbo Cache Invalidation

### Problem
After fixing type errors, `pnpm typecheck` still showed the same errors.

### Root Cause
Turbo caches task outputs in the `.turbo/` folder. When debugging type issues, stale cache entries mask whether fixes actually worked.

### Solution
Always clear the turbo cache when debugging build/type issues:
```bash
rm -rf .turbo && pnpm typecheck
```

---

## 4. ESLint JSX Entity Escaping

### Problem
ESLint reported errors for unescaped quotes and apostrophes in JSX:
```
`"` can be escaped with `&quot;`
`'` can be escaped with `&apos;`
```

### Affected Files (in this session)
- `CustomerDetailPage.tsx` - Inch symbols in measurement displays (`36"`)
- `DashboardPage.tsx` - Apostrophes in text content (`Here's`, `You're`)

### Solution
Replace literal characters with HTML entities:
```tsx
// Before
<span>{value}" x {value2}"</span>
<p>Here's what's happening</p>

// After
<span>{value}&quot; x {value2}&quot;</span>
<p>Here&apos;s what&apos;s happening</p>
```

---

## 5. Unused Variables from Destructuring

### Problem
When using destructuring to exclude a property, ESLint reports unused variable:
```typescript
const { failedAt, ...rest } = obj; // Error: 'failedAt' is assigned but never used
```

### What Did NOT Work
Underscore prefix did NOT work in this codebase:
```typescript
const { failedAt: _failedAt, ...rest } = obj;
// Still fails: '_failedAt' is assigned a value but never used
```

### What DID Work
Add an eslint-disable comment on the line above:
```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { failedAt, ...rest } = obj;
```

---

## 6. Sequence of TypeScript Errors During Fix

### What We Observed
The fix process showed a progression of errors that can help diagnose issues:

1. **Initial error** - Type doesn't have the new property:
   ```
   error TS2339: Property 'version' does not exist on type
   ```
   Cause: Stale `.d.ts` files in dist/

2. **After deleting dist/** - Output file not built:
   ```
   error TS6305: Output file 'dist/index.d.ts' has not been built from source file
   ```
   Cause: Deleted dist but didn't rebuild

3. **After running `npx tsc` (without --build)** - dist folder not created:
   ```
   ls: cannot access 'dist/': No such file or directory
   ```
   Cause: Composite projects require `--build` flag

4. **After `npx tsc --build`** - Success:
   ```
   Tasks: 5 successful, 5 total
   ```

### Key Insight
For composite TypeScript projects, you MUST use `tsc --build`, not plain `tsc`.

---

## Quick Reference Checklist

### When Adding a Database Column
- [ ] Add to `packages/db/src/schema/*.ts`
- [ ] Check shared Zod schemas: `packages/shared/src/schemas/`
- [ ] Search for LOCAL Zod schemas: `grep -r "Schema = " packages/api/src/routers/`
- [ ] Rebuild db: `cd packages/db && npx tsc --build`
- [ ] Clear cache: `rm -rf .turbo`
- [ ] Verify: `pnpm typecheck && pnpm lint`

### When Debugging Type Errors
1. Clear turbo cache: `rm -rf .turbo`
2. Clean rebuild db: `cd packages/db && rm -f tsconfig.tsbuildinfo && npx tsc --build`
3. Verify `.d.ts` files exist and contain expected properties
4. Check both shared AND local Zod schemas for missing fields
5. Re-run: `pnpm typecheck`
