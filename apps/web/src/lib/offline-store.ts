import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { PendingSync } from '@ihms/shared';

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
  pendingSync: {
    key: string;
    value: PendingSync<unknown>;
    indexes: { 'by-entity': string; 'by-created': Date };
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
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IHMSDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<IHMSDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<IHMSDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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

        // Pending sync store
        if (!db.objectStoreNames.contains('pendingSync')) {
          const pendingSyncStore = db.createObjectStore('pendingSync', { keyPath: 'id' });
          pendingSyncStore.createIndex('by-entity', 'entity');
          pendingSyncStore.createIndex('by-created', 'createdAt');
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
export async function addPendingSync<T>(sync: PendingSync<T>): Promise<void> {
  const db = await getDB();
  await db.put('pendingSync', sync as PendingSync<unknown>);
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

// Utility to generate local IDs
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
