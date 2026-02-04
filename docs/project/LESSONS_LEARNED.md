# IHMS Lessons Learned

This document captures important lessons learned during development to prevent future issues.

---

## 2026-02-01: ESM dotenv Loading with tsx --import

### The Problem

When adding dotenv support to load environment variables for the server, an overly complex ESM-based approach was used that didn't work reliably.

### What Was Attempted

```typescript
// server/src/env-loader.ts (BROKEN VERSION)
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });
```

Combined with:
```json
{
  "scripts": {
    "dev": "tsx watch --import ./src/env-loader.ts src/index.ts"
  }
}
```

### Why It Failed

1. **ESM path resolution timing**: When using `--import` with tsx, the `import.meta.url` and derived `__dirname` don't always point to the expected location during the preload phase.

2. **Working directory context**: The `__dirname` approach assumes a specific relative path structure, but tsx may resolve paths differently during the import phase.

3. **Silent failure**: The dotenv loading failed silently, and the app appeared to work only because fallback default values in `packages/db/src/client.ts` happened to match the actual database configuration:
   ```typescript
   const connectionString = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';
   ```

### The Fix

Use `process.cwd()` instead of ESM path resolution:

```typescript
// server/src/env-loader.ts (FIXED VERSION)
import { config } from 'dotenv';
import { resolve } from 'path';

// process.cwd() reliably points to where the command was run from
const envPath = resolve(process.cwd(), '.env');
const result = config({ path: envPath });

if (result.error) {
  console.warn(`[env-loader] Warning: Could not load .env from ${envPath}`);
} else {
  console.log(`[env-loader] Loaded ${Object.keys(result.parsed || {}).length} env vars`);
}
```

### Key Takeaways

1. **Always verify environment variables are loaded**: Add logging to confirm env vars are actually being loaded, don't assume they are.

2. **Avoid fallback defaults that match production/dev values**: If a fallback happens to work, you won't notice the configuration is broken until values diverge.

3. **Prefer simple solutions**: Using `process.cwd()` is simpler and more reliable than ESM path manipulation with `import.meta.url`.

4. **Test environment loading explicitly**:
   ```bash
   pnpm --filter @ihms/server exec node -e "console.log('DATABASE_URL:', process.env.DATABASE_URL)"
   ```

---

## Database Connection Best Practices

### Connection Pooling

Always configure explicit connection pool settings:

```typescript
const queryClient = postgres(connectionString, {
  max: 10,                // Maximum connections in pool
  idle_timeout: 20,       // Close idle connections after 20 seconds
  max_lifetime: 60 * 30,  // Recycle connections every 30 minutes
  connect_timeout: 30,    // Fail connection attempt after 30 seconds
});
```

### Graceful Shutdown

Always close database connections on shutdown:

```typescript
process.on('SIGTERM', async () => {
  await closeDb();
  process.exit(0);
});
```

### Health Checks

Include database connectivity in health endpoints:

```typescript
app.get('/health', async (_req, res) => {
  const dbHealth = await checkDbHealth();
  res.status(dbHealth.connected ? 200 : 503).json({
    status: dbHealth.connected ? 'ok' : 'degraded',
    database: dbHealth.connected ? 'connected' : 'disconnected',
  });
});
```

---

*Last Updated: 2026-02-01*
