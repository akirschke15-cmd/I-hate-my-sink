export type UserRole = 'admin' | 'salesperson';

export type SinkMaterial =
  | 'stainless_steel'
  | 'granite_composite'
  | 'cast_iron'
  | 'fireclay'
  | 'copper'
  | 'porcelain';

export type SinkMountingStyle = 'undermount' | 'drop_in' | 'farmhouse' | 'flush_mount';

export type CountertopMaterial =
  | 'granite'
  | 'quartz'
  | 'marble'
  | 'laminate'
  | 'solid_surface'
  | 'butcher_block'
  | 'concrete'
  | 'tile'
  | 'stainless_steel';

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export type LineItemType = 'product' | 'labor' | 'material' | 'other';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  companyName: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// Offline sync types
export interface SyncableEntity {
  localId?: string;
  syncedAt?: Date;
  version?: number;
}

export type SyncEntity = 'customer' | 'measurement' | 'quote';

export interface PendingSync<T = unknown> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: SyncEntity;
  data: T;
  createdAt: Date;
  retryCount: number;
  lastAttempt?: Date;
}

export interface SyncableRecord {
  id: string;
  localId?: string;
  version?: number;
  [key: string]: unknown;
}

// Conflict resolution types
export interface Conflict<T = unknown> {
  id: string;
  type: 'customer' | 'measurement' | 'quote';
  localData: T;
  serverData: T;
  createdAt: Date;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'keep_local' | 'keep_server' | 'manual';
  resolvedData?: unknown;
}
