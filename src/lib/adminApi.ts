import { supabase } from "@/lib/supabaseClient";

/**
 * Admin data access. The generated Supabase types do not know the admin tables/RPCs,
 * so we talk to the client through a minimal local interface. This is UX only:
 * real authorization is enforced by RLS and the SECURITY DEFINER admin RPCs.
 */

export const ADMIN_PAGE_SIZE = 20;
export const MIGRATION_HINT = "Apply the admin migrations (see supabase/MIGRATIONS_README.md)";

export type AppRole = "volunteer" | "organization" | "admin";
export const APP_ROLES: AppRole[] = ["volunteer", "organization", "admin"];

interface DbError {
  message: string;
  code?: string;
}
interface DbResult<T> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}
interface LooseQuery<T> extends PromiseLike<DbResult<T>> {
  select(columns: string, opts?: { count?: "exact"; head?: boolean }): LooseQuery<T>;
  eq(column: string, value: string | boolean): LooseQuery<T>;
  in(column: string, values: string[]): LooseQuery<T>;
  or(filter: string): LooseQuery<T>;
  order(column: string, opts?: { ascending: boolean }): LooseQuery<T>;
  range(from: number, to: number): LooseQuery<T>;
}
interface LooseClient {
  from<T>(table: string): LooseQuery<T>;
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<DbResult<unknown>>;
}

const db = supabase as unknown as LooseClient;

export class AdminApiError extends Error {
  readonly migrationMissing: boolean;
  constructor(message: string, migrationMissing: boolean) {
    super(migrationMissing ? `${MIGRATION_HINT}. (${message})` : message);
    this.name = "AdminApiError";
    this.migrationMissing = migrationMissing;
  }
}

const toError = (e: DbError): AdminApiError => {
  const msg = e.message ?? "Unknown error";
  const lower = msg.toLowerCase();
  const missing =
    e.code === "42883" ||
    e.code === "42P01" ||
    e.code === "42501" ||
    e.code === "PGRST202" ||
    e.code === "PGRST205" ||
    lower.includes("does not exist") ||
    lower.includes("permission denied") ||
    lower.includes("could not find the function");
  return new AdminApiError(msg, missing);
};

/** Strip characters that would break PostgREST or()/ilike filter syntax. */
const sanitize = (s: string): string => s.trim().replace(/[,()%*\\]/g, " ").trim();

export interface Page<T> {
  rows: T[];
  total: number;
}

export interface OverviewCounts {
  volunteers: number;
  organizations: number;
  verifiedOrgs: number;
  unverifiedOrgs: number;
  opportunities: number;
  registrations: number;
}

const countOf = async (q: LooseQuery<unknown>): Promise<number> => {
  const res = await q;
  if (res.error) throw toError(res.error);
  return res.count ?? 0;
};

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await db.rpc("is_admin", { p_user: userId });
  if (error) throw toError(error);
  return data === true;
}

export async function fetchOverview(): Promise<OverviewCounts> {
  const head = { count: "exact", head: true } as const;
  const [volunteers, organizations, verifiedOrgs, opportunities, registrations] = await Promise.all([
    countOf(db.from<unknown>("profiles").select("id", head)),
    countOf(db.from<unknown>("organizations").select("id", head)),
    countOf(db.from<unknown>("organizations").select("id", head).eq("verified", true)),
    countOf(db.from<unknown>("opportunities").select("id", head)),
    countOf(db.from<unknown>("volunteer_registrations").select("id", head)),
  ]);
  return {
    volunteers,
    organizations,
    verifiedOrgs,
    unverifiedOrgs: Math.max(0, organizations - verifiedOrgs),
    opportunities,
    registrations,
  };
}

export interface AdminOrg {
  id: string;
  name: string;
  contact_email: string;
  city: string | null;
  verified: boolean;
  created_at: string;
}

export async function fetchOrganizations(page: number, search: string): Promise<Page<AdminOrg>> {
  const from = page * ADMIN_PAGE_SIZE;
  let q = db
    .from<AdminOrg[]>("organizations")
    .select("id, name, contact_email, city, verified, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const s = sanitize(search);
  if (s) q = q.or(`name.ilike.%${s}%,contact_email.ilike.%${s}%,city.ilike.%${s}%`);
  const res = await q;
  if (res.error) throw toError(res.error);
  return { rows: res.data ?? [], total: res.count ?? 0 };
}

export async function setOrgVerified(orgId: string, verified: boolean): Promise<void> {
  const { error } = await db.rpc("admin_set_org_verified", { p_org_id: orgId, p_verified: verified });
  if (error) throw toError(error);
}

export interface AdminUser {
  user_id: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}
interface ProfileRow {
  user_id: string;
  full_name: string | null;
  created_at: string;
}
interface RoleRow {
  user_id: string;
  role: AppRole;
}

export async function fetchUsers(page: number, search: string): Promise<Page<AdminUser>> {
  const from = page * ADMIN_PAGE_SIZE;
  let q = db
    .from<ProfileRow[]>("profiles")
    .select("user_id, full_name, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const s = sanitize(search);
  if (s) q = q.or(`full_name.ilike.%${s}%`);
  const res = await q;
  if (res.error) throw toError(res.error);
  const profiles = res.data ?? [];
  const roleMap = new Map<string, AppRole[]>();
  if (profiles.length > 0) {
    const roles = await db
      .from<RoleRow[]>("user_roles")
      .select("user_id, role")
      .in("user_id", profiles.map((p) => p.user_id));
    if (roles.error) throw toError(roles.error);
    for (const r of roles.data ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }
  }
  return {
    rows: profiles.map((p) => ({ ...p, roles: roleMap.get(p.user_id) ?? [] })),
    total: res.count ?? 0,
  };
}

export async function setUserRole(userId: string, role: AppRole, grant: boolean): Promise<void> {
  const { error } = await db.rpc("admin_set_user_role", { p_user_id: userId, p_role: role, p_grant: grant });
  if (error) throw toError(error);
}

export interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export async function fetchAuditLog(page: number, search: string): Promise<Page<AuditEntry>> {
  const from = page * ADMIN_PAGE_SIZE;
  let q = db
    .from<AuditEntry[]>("admin_audit_log")
    .select("id, admin_id, action, target_type, target_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const s = sanitize(search);
  if (s) q = q.or(`action.ilike.%${s}%,target_type.ilike.%${s}%,target_id.ilike.%${s}%`);
  const res = await q;
  if (res.error) throw toError(res.error);
  return { rows: res.data ?? [], total: res.count ?? 0 };
}
