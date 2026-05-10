import type { SyncStatus, SyncPriority } from '../constants/sync-status';

export interface SyncQueueEntry {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update';
  payload: Record<string, unknown>;
  priority: SyncPriority;
  status: SyncStatus;
  attempts: number;
  nextRetryAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatusEvent {
  status: 'online' | 'offline' | 'syncing' | 'error';
  pendingCount: number;
  lastSyncAt?: string;
  lastError?: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: Record<string, unknown>;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
