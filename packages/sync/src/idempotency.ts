import type { SyncEntityType } from './types';

/**
 * Generates the idempotency key sent as a request header on all sync calls.
 * Format: {entityType}:{localId}:{version}
 * The API uses this to deduplicate retried requests.
 */
export function buildIdempotencyKey(
  entityType: SyncEntityType,
  localId: string,
  version: number,
): string {
  return `${entityType}:${localId}:${version}`;
}
