import { supabase } from "@/lib/supabaseClient";

/**
 * Loose (untyped) access for tables and RPCs that are newer than the generated
 * Supabase types. Authorization is always enforced by RLS / SECURITY DEFINER RPCs,
 * never by this wrapper.
 */
export interface DbError {
  message: string;
  code?: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LooseQuery<T = any> extends PromiseLike<DbResult<T>> {
  select(columns?: string, opts?: { count?: "exact"; head?: boolean }): LooseQuery<T>;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): LooseQuery<T>;
  update(values: Record<string, unknown>): LooseQuery<T>;
  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }): LooseQuery<T>;
  delete(): LooseQuery<T>;
  eq(column: string, value: string | number | boolean): LooseQuery<T>;
  neq(column: string, value: string | number | boolean): LooseQuery<T>;
  in(column: string, values: (string | number)[]): LooseQuery<T>;
  gte(column: string, value: string | number): LooseQuery<T>;
  lte(column: string, value: string | number): LooseQuery<T>;
  is(column: string, value: null | boolean): LooseQuery<T>;
  or(filter: string): LooseQuery<T>;
  order(column: string, opts?: { ascending?: boolean }): LooseQuery<T>;
  limit(n: number): LooseQuery<T>;
  range(from: number, to: number): LooseQuery<T>;
  single(): LooseQuery<T>;
  maybeSingle(): LooseQuery<T>;
}

interface LooseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from<T = any>(table: string): LooseQuery<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc<T = any>(fn: string, args?: Record<string, unknown>): PromiseLike<DbResult<T>>;
}

export const db = supabase as unknown as LooseClient;

/** Throw a real Error from a Supabase-style error object. */
export function unwrap<T>(res: DbResult<T>): T {
  if (res.error) {
    const err = new Error(res.error.message || "Request failed") as Error & { code?: string };
    err.code = res.error.code;
    throw err;
  }
  return res.data as T;
}

/** True when the error means a migration has not been applied yet (missing table/function). */
export function isMissingMigration(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  const msg = String((e as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    code === "42883" ||
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the")
  );
}
