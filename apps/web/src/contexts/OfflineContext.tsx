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
  }, [isOnline]);

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
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('No auth token available');
  }

  // This would be expanded to handle different entity types and operations
  // For now, it's a placeholder for the sync logic
  console.log('Processing sync item:', item);

  // Example API call structure:
  // const response = await fetch(`/trpc/${item.entity}.${item.type}`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${token}`,
  //   },
  //   body: JSON.stringify(item.data),
  // });

  // For now, just simulate success
  await new Promise((resolve) => setTimeout(resolve, 100));
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
