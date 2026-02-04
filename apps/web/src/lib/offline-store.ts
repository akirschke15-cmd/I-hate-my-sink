import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { PendingSync, Conflict } from '@ihms/shared';

interface IHMSDBSchema extends DBSchema {
  measurements: {
    key: string;
    value: {
      id: string;
      localId: string;
      customerId: string;
      cabinetWidthInches: number;
      cabinetDepthInches: number;
      cabinetHeightInches: number;
      countertopMaterial?: string;
      countertopThicknessInches?: number;
      existingCutoutWidthInches?: number;
      existingCutoutDepthInches?: number;
      location?: string;
      notes?: string;
      photos?: string[];
      syncedAt?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-customer': string; 'by-local-id': string };
  };
  customers: {
    key: string;
    value: {
      id: string;
      localId: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
      syncedAt?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-local-id': string };
  };
  quotes: {
    key: string;
    value: {
      id: string;
      localId: string;
      customerId: string;
      measurementId?: string;
      quoteNumber?: string;
      status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      discountAmount: number;
      total: number;
      validUntil?: Date;
      notes?: string;
      syncedAt?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
    indexes: { 'by-customer': string; 'by-local-id': string; 'by-status': string };
  };
  quoteLineItems: {
    key: string;
    value: {
      id: string;
      quoteId: string;
      sinkId?: string;
      type: 'product' | 'labor' | 'material' | 'other';
      name: string;
      description?: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      lineTotal: number;
      sortOrder: number;
    };
    indexes: { 'by-quote': string };
  };
  pendingSync: {
    key: string;
    value: PendingSync<unknown>;
    indexes: { 'by-entity': string; 'by-created': Date };
  };
  failedSync: {
    key: string;
    value: PendingSync<unknown> & { failedAt: Date };
    indexes: { 'by-entity': string; 'by-failed': Date };
  };
  conflicts: {
    key: string;
    value: Conflict<unknown>;
    indexes: { 'by-type': string; 'by-created': Date };
  };
  authCache: {
    key: string;
    value: {
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        companyId: string;
        companyName: string;
      };
      expiresAt: number;
    };
  };
}

const DB_NAME = 'ihms-offline';
const DB_VERSION = 4; // Incremented for conflicts store and version tracking

let dbPromise: Promise<IDBPDatabase<IHMSDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<IHMSDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<IHMSDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Measurements store
        if (!db.objectStoreNames.contains('measurements')) {
          const measurementsStore = db.createObjectStore('measurements', { keyPath: 'id' });
          measurementsStore.createIndex('by-customer', 'customerId');
          measurementsStore.createIndex('by-local-id', 'localId');
        }

        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
          customersStore.createIndex('by-local-id', 'localId');
        }

        // Quotes store (added in v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains('quotes')) {
          const quotesStore = db.createObjectStore('quotes', { keyPath: 'id' });
          quotesStore.createIndex('by-customer', 'customerId');
          quotesStore.createIndex('by-local-id', 'localId');
          quotesStore.createIndex('by-status', 'status');
        }

        // Quote line items store (added in v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains('quoteLineItems')) {
          const quoteLineItemsStore = db.createObjectStore('quoteLineItems', { keyPath: 'id' });
          quoteLineItemsStore.createIndex('by-quote', 'quoteId');
        }

        // Pending sync store
        if (!db.objectStoreNames.contains('pendingSync')) {
          const pendingSyncStore = db.createObjectStore('pendingSync', { keyPath: 'id' });
          pendingSyncStore.createIndex('by-entity', 'entity');
          pendingSyncStore.createIndex('by-created', 'createdAt');
        }

        // Failed sync store (added in v3)
        if (oldVersion < 3 && !db.objectStoreNames.contains('failedSync')) {
          const failedSyncStore = db.createObjectStore('failedSync', { keyPath: 'id' });
          failedSyncStore.createIndex('by-entity', 'entity');
          failedSyncStore.createIndex('by-failed', 'failedAt');
        }

        // Conflicts store (added in v4)
        if (oldVersion < 4 && !db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('by-type', 'type');
          conflictsStore.createIndex('by-created', 'createdAt');
        }

        // Auth cache store
        if (!db.objectStoreNames.contains('authCache')) {
          db.createObjectStore('authCache', { keyPath: 'accessToken' });
        }
      },
    });
  }
  return dbPromise;
}

// Measurement operations
export async function saveMeasurement(
  measurement: IHMSDBSchema['measurements']['value']
): Promise<void> {
  const db = await getDB();
  await db.put('measurements', measurement);
}

export async function getMeasurement(
  id: string
): Promise<IHMSDBSchema['measurements']['value'] | undefined> {
  const db = await getDB();
  return db.get('measurements', id);
}

export async function getMeasurementsByCustomer(
  customerId: string
): Promise<IHMSDBSchema['measurements']['value'][]> {
  const db = await getDB();
  return db.getAllFromIndex('measurements', 'by-customer', customerId);
}

// Customer operations
export async function saveCustomer(customer: IHMSDBSchema['customers']['value']): Promise<void> {
  const db = await getDB();
  await db.put('customers', customer);
}

export async function getCustomer(
  id: string
): Promise<IHMSDBSchema['customers']['value'] | undefined> {
  const db = await getDB();
  return db.get('customers', id);
}

// Pending sync operations
export async function addPendingSync<T>(
  sync: Omit<PendingSync<T>, 'retryCount' | 'lastAttempt'>
): Promise<void> {
  const db = await getDB();
  await db.put('pendingSync', {
    ...sync,
    retryCount: 0,
    lastAttempt: undefined,
  } as PendingSync<unknown>);
}

export async function getPendingSyncs(): Promise<PendingSync<unknown>[]> {
  const db = await getDB();
  return db.getAll('pendingSync');
}

export async function removePendingSync(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingSync', id);
}

// Auth cache operations
export async function cacheAuth(auth: IHMSDBSchema['authCache']['value']): Promise<void> {
  const db = await getDB();
  await db.put('authCache', auth);
}

export async function getCachedAuth(): Promise<IHMSDBSchema['authCache']['value'] | undefined> {
  const db = await getDB();
  const all = await db.getAll('authCache');
  return all[0];
}

export async function clearAuthCache(): Promise<void> {
  const db = await getDB();
  await db.clear('authCache');
}

// Quote operations
export async function saveQuote(quote: IHMSDBSchema['quotes']['value']): Promise<void> {
  const db = await getDB();
  await db.put('quotes', quote);
}

export async function getQuote(
  id: string
): Promise<IHMSDBSchema['quotes']['value'] | undefined> {
  const db = await getDB();
  return db.get('quotes', id);
}

export async function getQuotesByCustomer(
  customerId: string
): Promise<IHMSDBSchema['quotes']['value'][]> {
  const db = await getDB();
  return db.getAllFromIndex('quotes', 'by-customer', customerId);
}

export async function getAllQuotes(): Promise<IHMSDBSchema['quotes']['value'][]> {
  const db = await getDB();
  return db.getAll('quotes');
}

// Quote line item operations
export async function saveQuoteLineItem(
  lineItem: IHMSDBSchema['quoteLineItems']['value']
): Promise<void> {
  const db = await getDB();
  await db.put('quoteLineItems', lineItem);
}

export async function getQuoteLineItem(
  id: string
): Promise<IHMSDBSchema['quoteLineItems']['value'] | undefined> {
  const db = await getDB();
  return db.get('quoteLineItems', id);
}

export async function getQuoteLineItemsByQuote(
  quoteId: string
): Promise<IHMSDBSchema['quoteLineItems']['value'][]> {
  const db = await getDB();
  return db.getAllFromIndex('quoteLineItems', 'by-quote', quoteId);
}

export async function deleteQuoteLineItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('quoteLineItems', id);
}

// Utility to generate local IDs
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Retry management for pending sync
export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB();
  const sync = await db.get('pendingSync', id);
  if (sync) {
    await db.put('pendingSync', {
      ...sync,
      retryCount: (sync.retryCount || 0) + 1,
      lastAttempt: new Date(),
    });
  }
}

export async function markSyncFailed(id: string): Promise<void> {
  const db = await getDB();
  const sync = await db.get('pendingSync', id);
  if (sync) {
    // Move to failed sync store
    await db.put('failedSync', {
      ...sync,
      failedAt: new Date(),
    });
    // Remove from pending sync
    await db.delete('pendingSync', id);
  }
}

export async function getFailedSyncs(): Promise<
  Array<PendingSync<unknown> & { failedAt: Date }>
> {
  const db = await getDB();
  return db.getAll('failedSync');
}

export async function retryFailedSync(id: string): Promise<void> {
  const db = await getDB();
  const failedSync = await db.get('failedSync', id);
  if (failedSync) {
    // Move back to pending sync with reset retry count
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { failedAt, ...syncData } = failedSync;
    await db.put('pendingSync', {
      ...syncData,
      retryCount: 0,
      lastAttempt: undefined,
    });
    // Remove from failed sync
    await db.delete('failedSync', id);
  }
}

// Conflict operations
export async function addConflict<T>(conflict: Conflict<T>): Promise<void> {
  const db = await getDB();
  await db.put('conflicts', conflict as Conflict<unknown>);
}

export async function getConflicts(): Promise<Conflict<unknown>[]> {
  const db = await getDB();
  return db.getAll('conflicts');
}

export async function getConflict(id: string): Promise<Conflict<unknown> | undefined> {
  const db = await getDB();
  return db.get('conflicts', id);
}

export async function removeConflict(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conflicts', id);
}

export async function clearConflicts(): Promise<void> {
  const db = await getDB();
  await db.clear('conflicts');
}
