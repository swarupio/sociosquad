import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePublicOpportunities } from "./useOrganization";

let mockUser: { id: string; email: string } | null = { id: "user-1", email: "test@example.com" };

const mockInsertRegistration = vi.fn();
const mockDeleteRegistration = vi.fn();

vi.mock("./useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock("./use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "opportunities") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      if (table === "volunteer_registrations") {
        return {
          insert: mockInsertRegistration,
          delete: () => ({
            eq: () => ({
              eq: mockDeleteRegistration,
            }),
          }),
        };
      }

      if (table === "organizations") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    },
  },
}));

describe("usePublicOpportunities register/unregister reliability", () => {
  beforeEach(() => {
    mockUser = { id: "user-1", email: "test@example.com" };
    mockInsertRegistration.mockReset();
    mockDeleteRegistration.mockReset();
  });

  it("returns success=false when register fails", async () => {
    mockInsertRegistration.mockResolvedValue({ error: { message: "duplicate registration" } });

    const { result } = renderHook(() => usePublicOpportunities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: Awaited<ReturnType<typeof result.current.register>> | undefined;
    await act(async () => {
      response = await result.current.register("opp-1");
    });

    expect(response).toEqual({ success: false, message: "duplicate registration" });
  });

  it("returns success=true when register succeeds", async () => {
    mockInsertRegistration.mockResolvedValue({ error: null });

    const { result } = renderHook(() => usePublicOpportunities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: Awaited<ReturnType<typeof result.current.register>> | undefined;
    await act(async () => {
      response = await result.current.register("opp-1");
    });

    expect(response).toEqual({ success: true });
  });

  it("returns success=false when unregister fails", async () => {
    mockDeleteRegistration.mockResolvedValue({ error: { message: "delete failed" } });

    const { result } = renderHook(() => usePublicOpportunities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: Awaited<ReturnType<typeof result.current.unregister>> | undefined;
    await act(async () => {
      response = await result.current.unregister("opp-1");
    });

    expect(response).toEqual({ success: false, message: "delete failed" });
  });
});
