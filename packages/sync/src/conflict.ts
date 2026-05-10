import type { ConflictContext, ConflictResolutionStrategy } from './types';

/**
 * Resolves sync conflicts using last-write-wins strategy.
 * Returns 'local' if local data should be kept, 'remote' if remote wins.
 */
export function resolveConflict(
  ctx: ConflictContext,
  strategy: ConflictResolutionStrategy = 'last-write-wins',
): 'local' | 'remote' {
  if (strategy === 'local-wins') return 'local';
  if (strategy === 'remote-wins') return 'remote';

  // last-write-wins: compare updatedAt timestamps
  return ctx.localUpdatedAt >= ctx.remoteUpdatedAt ? 'local' : 'remote';
}
