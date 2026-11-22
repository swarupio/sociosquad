import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

type AuthState = { user: { id: string } | null; isReady: boolean };
let authState: AuthState = { user: null, isReady: true };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

const AuthProbe = () => {
  const loc = useLocation();
  return <div data-testid="auth">{loc.pathname + loc.search}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<AuthProbe />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("ProtectedRoute", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    authState = { user: null, isReady: true };
  });

  it("redirects signed-out users to /auth with next param", () => {
    renderAt("/dashboard?tab=1");
    expect(screen.getByTestId("auth").textContent).toBe(
      `/auth?next=${encodeURIComponent("/dashboard?tab=1")}`
    );
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("shows a spinner and no content while not ready", () => {
    authState = { user: null, isReady: false };
    const { container } = renderAt("/dashboard");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("secret")).toBeNull();
    expect(screen.queryByTestId("auth")).toBeNull();
  });

  it("renders children when signed in", () => {
    authState = { user: { id: "u1" }, isReady: true };
    renderAt("/dashboard");
    expect(screen.getByText("secret")).toBeTruthy();
  });
});
