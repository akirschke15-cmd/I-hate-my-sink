import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test for local testing
// CI provides DATABASE_URL via environment variables
if (process.env.CI !== 'true') {
  config({ path: resolve(__dirname, '../../.env.test') });
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
