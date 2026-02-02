// Preload script to load environment variables before the main module
//
// LESSON LEARNED (2026-02-01):
// When running via turbo/pnpm workspaces, process.cwd() may be either:
// - The monorepo root (when running pnpm dev from root)
// - The server directory (when turbo runs the script)
//
// FIX: Try multiple possible locations for the .env file

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Possible .env locations (in order of preference)
const possiblePaths = [
  resolve(process.cwd(), '.env'),           // Current directory
  resolve(process.cwd(), '../.env'),        // Parent (if in server/)
  resolve(process.cwd(), '../../.env'),     // Grandparent (if nested deeper)
];

let loaded = false;
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    const result = config({ path: envPath });
    if (!result.error) {
      console.log(`[env-loader] Loaded ${Object.keys(result.parsed || {}).length} env vars from ${envPath}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  console.warn('[env-loader] Warning: Could not find .env file in any expected location');
  console.warn('[env-loader] Searched:', possiblePaths.join(', '));
}
