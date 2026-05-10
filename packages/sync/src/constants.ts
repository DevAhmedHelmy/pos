export const SYNC_QUEUE_NAME = 'pos-sync';

export const RETRY_DELAYS_SECONDS = [5, 10, 20, 40, 80, 160, 300, 300, 300, 300];

export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length;

export const SYNC_PRIORITIES = {
  AUDIT_LOG: 1,
  SALE: 2,
  REFUND: 2,
  SHIFT: 3,
  CATALOG: 9,
} as const;
