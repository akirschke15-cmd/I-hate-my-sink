import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getPendingSyncs, removePendingSync } from '../lib/offline-store';
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

async function processSyncItem(item: PendingSync<unknown>): Promise<void> {
  // TODO: Implement actual sync with tRPC mutations
  // This is currently a DEMO/PLACEHOLDER implementation
  //
  // Real implementation would:
  // 1. Get the tRPC client instance
  // 2. Call appropriate mutation based on item.entity and item.type
  // 3. Handle errors and retries
  //
  // Example:
  // switch (item.entity) {
  //   case 'customer':
  //     if (item.type === 'create') await trpc.customer.create.mutate(item.data);
  //     else if (item.type === 'update') await trpc.customer.update.mutate(item.data);
  //     break;
  //   case 'measurement':
  //     if (item.type === 'create') await trpc.measurement.create.mutate(item.data);
  //     else if (item.type === 'update') await trpc.measurement.update.mutate(item.data);
  //     break;
  //   case 'quote':
  //     if (item.type === 'create') await trpc.quote.create.mutate(item.data);
  //     else if (item.type === 'update') await trpc.quote.update.mutate(item.data);
  //     break;
  // }

  console.log('[OfflineSync] Demo mode - would sync:', {
    id: item.id,
    entity: item.entity,
    type: item.type,
    createdAt: item.createdAt,
    retryCount: item.retryCount,
  });

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
