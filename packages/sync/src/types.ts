export type SyncEntityType = 'sale' | 'shift' | 'refund' | 'audit_log' | 'catalog';

export interface SyncJobPayload {
  entityType: SyncEntityType;
  entityId: string;
  localId: string;
  version: number;
  warehouseId: string;
  data: unknown;
}

export interface SyncResult {
  success: boolean;
  remoteId?: string;
  conflictResolved?: boolean;
  error?: string;
}

export type ConflictResolutionStrategy = 'last-write-wins' | 'local-wins' | 'remote-wins';

export interface ConflictContext {
  entityType: SyncEntityType;
  localVersion: number;
  remoteVersion: number;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
}
