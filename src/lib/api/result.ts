import { AppError, normalizeError } from './errors';

export type ApiResult<T> = { data: T | null; error: AppError | null };

/**
 * Await a Supabase query (or any promise-like). Never throws.
 * Handles both `{data,error}` shaped results and plain values.
 */
export async function run<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }> | PromiseLike<T>
): Promise<ApiResult<T>> {
  try {
    const res = (await promise) as unknown;
    if (res && typeof res === 'object' && 'error' in res && 'data' in res) {
      const r = res as { data: T | null; error: unknown };
      if (r.error) return { data: null, error: normalizeError(r.error) };
      return { data: r.data, error: null };
    }
    return { data: res as T, error: null };
  } catch (e) {
    return { data: null, error: normalizeError(e) };
  }
}
