import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';

// Configure connection pool with explicit settings to prevent:
// - Connection exhaustion under load
// - Connection leaks from idle connections
// - Stale connections from long-running processes
const queryClient = postgres(connectionString, {
  max: 10,                // Maximum connections in pool
  idle_timeout: 20,       // Close idle connections after 20 seconds
  max_lifetime: 60 * 30,  // Recycle connections every 30 minutes
  connect_timeout: 30,    // Fail connection attempt after 30 seconds
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

// For migrations and one-off scripts (separate single connection)
export function createMigrationClient() {
  const migrationClient = postgres(connectionString, {
    max: 1,
    idle_timeout: 0, // Keep alive for migration duration
  });
  return drizzle(migrationClient, { schema });
}

// Graceful shutdown - call this when the server is stopping
export async function closeDb(): Promise<void> {
  try {
    await queryClient.end({ timeout: 5 });
    console.log('[db] Database connections closed');
  } catch (error) {
    console.error('[db] Error closing database connections:', error);
  }
}

// Health check - verify database connectivity
export async function checkDbHealth(): Promise<{ connected: boolean; error?: string }> {
  try {
    await queryClient`SELECT 1`;
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { schema };
