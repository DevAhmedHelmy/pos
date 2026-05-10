import { RETRY_DELAYS_SECONDS, MAX_ATTEMPTS } from './constants';

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: (attempt: number) => number;
}

/**
 * Returns the retry policy for sync jobs.
 * attempt is 0-indexed (0 = first retry after initial failure).
 */
export const syncRetryPolicy: RetryPolicy = {
  maxAttempts: MAX_ATTEMPTS,
  delayMs: (attempt: number) => {
    const idx = Math.min(attempt, RETRY_DELAYS_SECONDS.length - 1);
    return (RETRY_DELAYS_SECONDS[idx] ?? 300) * 1000;
  },
};

export function isDeadLetter(attemptsMade: number): boolean {
  return attemptsMade >= MAX_ATTEMPTS;
}
