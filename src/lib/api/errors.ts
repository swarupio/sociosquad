export type AppErrorKind = 'network' | 'timeout' | 'auth' | 'permission' | 'not_found' | 'conflict' | 'validation' | 'paused' | 'server' | 'unknown';

export class AppError extends Error {
  kind: AppErrorKind;
  status?: number;
  code?: string;
  cause?: unknown;

  constructor(message: string, opts: { kind?: AppErrorKind; status?: number; code?: string; cause?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.kind = opts.kind ?? 'unknown';
    this.status = opts.status;
    this.code = opts.code;
    this.cause = opts.cause;
  }
}

export const isNetworkError = (e: unknown): boolean => {
  if (e instanceof AppError) return e.kind === 'network' || e.kind === 'timeout' || e.kind === 'paused';
  const msg = String((e as { message?: string })?.message ?? e ?? '').toLowerCase();
  const name = String((e as { name?: string })?.name ?? '');
  return (
    name === 'AbortError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('aborted')
  );
};

/** Convert any thrown/returned error (PostgREST, GoTrue, fetch, abort) into an AppError. */
export function normalizeError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const err = (e ?? {}) as { message?: string; code?: string; status?: number; name?: string; details?: string };
  const message = err.message ?? (typeof e === 'string' ? e : '');
  const lower = message.toLowerCase();
  const status = typeof err.status === 'number' ? err.status : undefined;
  const code = err.code;
  const base = { status, code, cause: e };

  if (err.name === 'AbortError' || lower.includes('aborted')) {
    return new AppError('The request took too long. Please check your connection and try again.', { ...base, kind: 'timeout' });
  }
  if (status === 540 || lower.includes('project is paused') || lower.includes('paused')) {
    return new AppError('The service is temporarily unavailable. Please try again in a few minutes.', { ...base, kind: 'paused' });
  }
  if (isNetworkError(e)) {
    return new AppError('Network problem. Please check your internet connection and try again.', { ...base, kind: 'network' });
  }
  if (code === '42501' || code === 'PGRST301' || status === 403 || lower.includes('row-level security')) {
    return new AppError("You don't have permission to do that.", { ...base, kind: 'permission' });
  }
  if (status === 401 || lower.includes('jwt') || lower.includes('invalid login credentials') || lower.includes('not authenticated')) {
    const msg = lower.includes('invalid login credentials') ? 'Incorrect email or password.' : 'Your session has expired. Please sign in again.';
    return new AppError(msg, { ...base, kind: 'auth' });
  }
  if (code === 'PGRST116' || status === 404) {
    return new AppError('We could not find what you were looking for.', { ...base, kind: 'not_found' });
  }
  if (code === '23505' || status === 409) {
    return new AppError('That already exists.', { ...base, kind: 'conflict' });
  }
  if (code === '23502' || code === '23503' || code === '23514' || code === '22P02' || status === 400 || status === 422) {
    return new AppError('Some of the information provided is invalid.', { ...base, kind: 'validation' });
  }
  if (status !== undefined && status >= 500) {
    return new AppError('Something went wrong on our side. Please try again.', { ...base, kind: 'server' });
  }
  return new AppError(message || 'Something went wrong. Please try again.', { ...base, kind: 'unknown' });
}

/** True for errors that retrying cannot fix (4xx, RLS, auth, validation). */
export const isClientError = (e: unknown): boolean => {
  const err = normalizeError(e);
  if (err.status !== undefined && err.status >= 400 && err.status < 500) return true;
  return ['auth', 'permission', 'not_found', 'conflict', 'validation'].includes(err.kind);
};
