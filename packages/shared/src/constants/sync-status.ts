export const SyncStatus = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error',
  DEAD: 'dead',
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

export const SyncPriority = {
  AUDIT_LOG: 1,
  SALE: 2,
  REFUND: 2,
  SHIFT: 3,
  CATALOG: 9,
} as const;

export type SyncPriority = (typeof SyncPriority)[keyof typeof SyncPriority];