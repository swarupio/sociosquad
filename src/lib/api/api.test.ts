import { describe, it, expect, vi, afterEach } from "vitest";
import { AppError, normalizeError, isNetworkError, isClientError } from "./errors";
import { run } from "./result";
import { withRetry } from "./retry";

describe("normalizeError", () => {
  it("maps PostgREST RLS error to permission", () => {
    const e = normalizeError({ code: "42501", message: "new row violates row-level security policy" });
    expect(e).toBeInstanceOf(AppError);
    expect(e.kind).toBe("permission");
  });

  it("maps unique violation to conflict", () => {
    expect(normalizeError({ code: "23505", message: "duplicate key" }).kind).toBe("conflict");
  });

  it("maps PGRST116 to not_found", () => {
    expect(normalizeError({ code: "PGRST116", message: "no rows" }).kind).toBe("not_found");
  });

  it("maps network TypeError to network", () => {
    expect(normalizeError(new TypeError("Failed to fetch")).kind).toBe("network");
  });

  it("maps AbortError to timeout", () => {
    const abort = new DOMException("The operation was aborted", "AbortError");
    expect(normalizeError(abort).kind).toBe("timeout");
  });

  it("maps paused project to paused", () => {
    expect(normalizeError({ status: 540, message: "x" }).kind).toBe("paused");
    expect(normalizeError({ message: "Project is paused" }).kind).toBe("paused");
  });

  it("maps invalid login credentials to auth", () => {
    const e = normalizeError({ message: "Invalid login credentials", status: 400 });
    expect(e.kind).toBe("auth");
    expect(e.message).toBe("Incorrect email or password.");
  });

  it("returns the same AppError unchanged", () => {
    const original = new AppError("x", { kind: "server" });
    expect(normalizeError(original)).toBe(original);
  });

  it("handles null and strings", () => {
    expect(normalizeError(null).kind).toBe("unknown");
    expect(normalizeError("boom").message).toBe("boom");
  });
});

describe("error helpers", () => {
  it("isNetworkError detects fetch failures", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError({ message: "duplicate" })).toBe(false);
  });

  it("isClientError flags 4xx and not network", () => {
    expect(isClientError({ status: 403, message: "no" })).toBe(true);
    expect(isClientError(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("run", () => {
  it("returns data on success", async () => {
    const res = await run(Promise.resolve({ data: [1, 2], error: null }));
    expect(res).toEqual({ data: [1, 2], error: null });
  });

  it("returns normalized error for error results", async () => {
    const res = await run(Promise.resolve({ data: null, error: { code: "23505", message: "dup" } }));
    expect(res.data).toBeNull();
    expect(res.error?.kind).toBe("conflict");
  });

  it("never throws on rejection", async () => {
    const res = await run(Promise.reject(new TypeError("Failed to fetch")));
    expect(res.data).toBeNull();
    expect(res.error?.kind).toBe("network");
  });

  it("passes through plain values", async () => {
    const res = await run(Promise.resolve(5));
    expect(res).toEqual({ data: 5, error: null });
  });
});

describe("withRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries network errors then succeeds", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce("ok");
    await expect(withRetry(fn, 2, 0)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws normalized error after exhausting retries", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(withRetry(fn, 2, 0)).rejects.toMatchObject({ kind: "network" });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry 4xx errors", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue({ status: 403, message: "forbidden" });
    await expect(withRetry(fn, 2, 0)).rejects.toMatchObject({ kind: "permission" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry client error results", async () => {
    const fn = vi
      .fn<() => Promise<{ data: null; error: unknown }>>()
      .mockResolvedValue({ data: null, error: { code: "42501", message: "rls" } });
    const res = await withRetry(fn, 2, 0);
    expect(res.error).toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient error results", async () => {
    const fn = vi
      .fn<() => Promise<{ data: string | null; error: unknown }>>()
      .mockResolvedValueOnce({ data: null, error: new TypeError("Failed to fetch") })
      .mockResolvedValueOnce({ data: "ok", error: null });
    const res = await withRetry(fn, 2, 0);
    expect(res.data).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
