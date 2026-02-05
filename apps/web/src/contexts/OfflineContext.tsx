import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import SuperJSON from 'superjson';
import type { AppRouter } from '@ihms/api';
import {
  getPendingSyncs,
  removePendingSync,
  saveCustomer,
  saveMeasurement,
  saveQuote,
  saveQuoteLineItem,
  incrementRetryCount,
  markSyncFailed,
  addConflict,
  generateLocalId,
} from '../lib/offline-store';
import type { PendingSync } from '@ihms/shared';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  syncPending: () => Promise<void>;
  isSyncing: boolean;
  hasConflicts: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// Maximum number of retry attempts before marking sync as failed
const MAX_RETRIES = 5;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);

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
    let conflictsDetected = false;

    try {
      const pending = await getPendingSyncs();

      for (const item of pending) {
        // Check if max retries exceeded
        if ((item.retryCount || 0) >= MAX_RETRIES) {
          console.error('[OfflineSync] Max retries exceeded for sync item:', item.id);
          await markSyncFailed(item.id);
          setPendingSyncCount((prev) => Math.max(0, prev - 1));
          continue;
        }

        // Exponential backoff: 2^retryCount seconds (1s, 2s, 4s, 8s, 16s)
        if (item.lastAttempt) {
          const backoffMs = Math.pow(2, item.retryCount || 0) * 1000;
          const timeSinceLastAttempt = Date.now() - new Date(item.lastAttempt).getTime();
          if (timeSinceLastAttempt < backoffMs) {
            console.log(
              `[OfflineSync] Skipping sync item ${item.id} due to backoff (${Math.ceil(
                (backoffMs - timeSinceLastAttempt) / 1000
              )}s remaining)`
            );
            continue; // Skip this item, not ready for retry yet
          }
        }

        try {
          await processSyncItem(item);
          await removePendingSync(item.id);
          setPendingSyncCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
          // Check if it's a conflict that was handled
          if (error instanceof TRPCClientError && error.data?.code === 'CONFLICT') {
            conflictsDetected = true;
            setPendingSyncCount((prev) => Math.max(0, prev - 1));
          } else {
            console.error('[OfflineSync] Failed to sync item:', item.id, error);
            await incrementRetryCount(item.id);
          }
        }
      }

      // Update conflicts flag if any were detected
      if (conflictsDetected) {
        setHasConflicts(true);
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
        hasConflicts,
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
        transformer: SuperJSON,
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
          try {
            const result = await client.customer.update.mutate(item.data as any);

            // Update IndexedDB with server version and sync timestamp
            const localRecord = item.data as any;
            if (localRecord.id) {
              await saveCustomer({
                ...localRecord,
                version: result.version,
                syncedAt: new Date(),
              });
            }

            console.log('[OfflineSync] Customer updated:', result.id);
          } catch (error) {
            if (error instanceof TRPCClientError && error.data?.code === 'CONFLICT') {
              // Conflict detected - store for user resolution
              const serverData = error.data.cause?.serverData;
              await addConflict({
                id: generateLocalId(),
                type: 'customer',
                localData: item.data,
                serverData: serverData,
                createdAt: new Date(),
              });
              // Remove from pending queue
              await removePendingSync(item.id);
              return; // Exit without throwing to prevent retry
            }
            throw error; // Re-throw other errors for retry
          }
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
          try {
            const result = await client.measurement.update.mutate(item.data as any);

            // Update IndexedDB with server version and sync timestamp
            const localRecord = item.data as any;
            if (localRecord.id) {
              await saveMeasurement({
                ...localRecord,
                version: result.version,
                syncedAt: new Date(),
              });
            }

            console.log('[OfflineSync] Measurement updated:', result.id);
          } catch (error) {
            if (error instanceof TRPCClientError && error.data?.code === 'CONFLICT') {
              // Conflict detected - store for user resolution
              const serverData = error.data.cause?.serverData;
              await addConflict({
                id: generateLocalId(),
                type: 'measurement',
                localData: item.data,
                serverData: serverData,
                createdAt: new Date(),
              });
              // Remove from pending queue
              await removePendingSync(item.id);
              return; // Exit without throwing to prevent retry
            }
            throw error; // Re-throw other errors for retry
          }
        }
        break;
      }

      case 'quote': {
        if (item.type === 'create') {
          // Create quote on server
          const result = await client.quote.create.mutate(item.data as any);

          // Update IndexedDB with server ID
          const localRecord = item.data as any;
          if (localRecord.id && result.id) {
            // Save the quote with server ID
            await saveQuote({
              id: result.id,
              localId: localRecord.localId,
              customerId: result.customerId,
              measurementId: result.measurementId,
              quoteNumber: result.quoteNumber,
              status: result.status as 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired',
              subtotal: parseFloat(result.subtotal),
              taxRate: parseFloat(result.taxRate),
              taxAmount: parseFloat(result.taxAmount),
              discountAmount: parseFloat(result.discountAmount),
              total: parseFloat(result.total),
              validUntil: result.validUntil ? new Date(result.validUntil) : undefined,
              notes: result.notes || undefined,
              syncedAt: new Date(),
              createdAt: new Date(result.createdAt),
              updatedAt: new Date(result.updatedAt),
            });

            // Save line items with server IDs
            if (result.lineItems && Array.isArray(result.lineItems)) {
              for (const lineItem of result.lineItems) {
                await saveQuoteLineItem({
                  id: lineItem.id,
                  quoteId: result.id,
                  sinkId: lineItem.sinkId || undefined,
                  type: lineItem.type as 'product' | 'labor' | 'material' | 'other',
                  name: lineItem.name,
                  description: lineItem.description || undefined,
                  sku: lineItem.sku || undefined,
                  quantity: lineItem.quantity,
                  unitPrice: parseFloat(lineItem.unitPrice),
                  discountPercent: parseFloat(lineItem.discountPercent),
                  lineTotal: parseFloat(lineItem.lineTotal),
                  sortOrder: lineItem.sortOrder,
                });
              }
            }
          }

          console.log('[OfflineSync] Quote created:', result.id);
        } else if (item.type === 'update') {
          try {
            const result = await client.quote.update.mutate(item.data as any);

            // Update IndexedDB with server version and sync timestamp
            const localRecord = item.data as any;
            if (localRecord.id) {
              await saveQuote({
                ...localRecord,
                version: result.version,
                syncedAt: new Date(),
              });
            }

            console.log('[OfflineSync] Quote updated:', result.id);
          } catch (error) {
            if (error instanceof TRPCClientError && error.data?.code === 'CONFLICT') {
              // Conflict detected - store for user resolution
              const serverData = error.data.cause?.serverData;
              await addConflict({
                id: generateLocalId(),
                type: 'quote',
                localData: item.data,
                serverData: serverData,
                createdAt: new Date(),
              });
              // Remove from pending queue
              await removePendingSync(item.id);
              return; // Exit without throwing to prevent retry
            }
            throw error; // Re-throw other errors for retry
          }
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
