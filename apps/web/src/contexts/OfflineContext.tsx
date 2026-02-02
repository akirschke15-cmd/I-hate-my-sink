import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@ihms/api';
import { getPendingSyncs, removePendingSync, saveCustomer, saveMeasurement } from '../lib/offline-store';
import type { PendingSync } from '@ihms/shared';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  syncPending: () => Promise<void>;
  isSyncing: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Define syncPending before the useEffects that reference it
  const syncPending = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const pending = await getPendingSyncs();

      for (const item of pending) {
        try {
          await processSyncItem(item);
          await removePendingSync(item.id);
          setPendingSyncCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
          // Item stays in queue for retry
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Check pending sync count
  useEffect(() => {
    async function checkPending() {
      const pending = await getPendingSyncs();
      setPendingSyncCount(pending.length);
    }

    checkPending();
    const interval = setInterval(checkPending, 10000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      syncPending();
    }
  }, [isOnline, pendingSyncCount, syncPending]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingSyncCount,
        syncPending,
        isSyncing,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Create a standalone tRPC client for use outside React hooks.
 * This client is used for offline sync operations where we can't use
 * React hooks. It uses the same authentication mechanism as the main
 * React client (accessing localStorage directly).
 */
function createStandaloneTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/trpc',
        headers() {
          const token = localStorage.getItem('accessToken');
          return token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {};
        },
      }),
    ],
  });
}

/**
 * Process a single pending sync item by calling the appropriate tRPC mutation.
 * This function handles creating and updating entities on the server, and
 * updates the local IndexedDB cache with server-generated IDs after successful sync.
 *
 * @param item - The pending sync item containing entity type, operation, and data
 * @throws Error if sync fails - the error is re-thrown to keep the item in the queue
 */
async function processSyncItem(item: PendingSync<unknown>): Promise<void> {
  const client = createStandaloneTRPCClient();

  console.log('[OfflineSync] Syncing:', {
    id: item.id,
    entity: item.entity,
    type: item.type,
    retryCount: item.retryCount,
  });

  try {
    switch (item.entity) {
      case 'customer': {
        if (item.type === 'create') {
          // Create customer on server
          const result = await client.customer.create.mutate(item.data as any);

          // Update IndexedDB with server ID
          const localRecord = item.data as any;
          if (localRecord.id && result.id) {
            await saveCustomer({
              ...localRecord,
              id: result.id, // Replace local ID with server ID
              syncedAt: new Date(),
            });
          }

          console.log('[OfflineSync] Customer created:', result.id);
        } else if (item.type === 'update') {
          const result = await client.customer.update.mutate(item.data as any);

          // Update IndexedDB sync timestamp
          const localRecord = item.data as any;
          if (localRecord.id) {
            await saveCustomer({
              ...localRecord,
              syncedAt: new Date(),
            });
          }

          console.log('[OfflineSync] Customer updated:', result.id);
        }
        break;
      }

      case 'measurement': {
        if (item.type === 'create') {
          // Create measurement on server
          const result = await client.measurement.create.mutate(item.data as any);

          // Update IndexedDB with server ID
          const localRecord = item.data as any;
          if (localRecord.id && result.id) {
            await saveMeasurement({
              ...localRecord,
              id: result.id, // Replace local ID with server ID
              syncedAt: new Date(),
            });
          }

          console.log('[OfflineSync] Measurement created:', result.id);
        } else if (item.type === 'update') {
          const result = await client.measurement.update.mutate(item.data as any);

          // Update IndexedDB sync timestamp
          const localRecord = item.data as any;
          if (localRecord.id) {
            await saveMeasurement({
              ...localRecord,
              syncedAt: new Date(),
            });
          }

          console.log('[OfflineSync] Measurement updated:', result.id);
        }
        break;
      }

      case 'quote': {
        if (item.type === 'create') {
          // Create quote on server
          const result = await client.quote.create.mutate(item.data as any);

          // Note: Quote IndexedDB storage not yet implemented in offline-store.ts
          // This will be added when quote offline support is implemented

          console.log('[OfflineSync] Quote created:', result.id);
        } else if (item.type === 'update') {
          const result = await client.quote.update.mutate(item.data as any);

          console.log('[OfflineSync] Quote updated:', result.id);
        }
        break;
      }

      default:
        console.warn('[OfflineSync] Unknown entity type:', item.entity);
    }
  } catch (error) {
    console.error('[OfflineSync] Sync failed:', error);
    throw error; // Re-throw to keep item in queue for retry
  }
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
