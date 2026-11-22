import { isClientError } from './errors';
import { normalizeError } from './errors';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry an idempotent READ. Up to `retries` extra attempts with exponential backoff.
 * Never retries 4xx / RLS / auth errors. Do not use for writes.
 * `fn` may throw, or resolve to `{data, error}` (error results are retried when transient).
 */
export async function withRetry<T>(fn: () => PromiseLike<T>, retries = 2, baseDelayMs = 400): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      const res = await fn();
      const resErr = (res as { error?: unknown } | null)?.error;
      if (resErr && attempt < retries && !isClientError(resErr)) {
        await sleep(baseDelayMs * 2 ** attempt++);
        continue;
      }
      return res;
    } catch (e) {
      if (attempt >= retries || isClientError(e)) throw normalizeError(e);
      await sleep(baseDelayMs * 2 ** attempt++);
    }
  }
}
