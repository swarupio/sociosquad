import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import AdminRoute from "./AdminRoute";

type AuthState = { user: { id: string } | null; isReady: boolean };
type AdminState = { isAdmin: boolean; isChecking: boolean };

let authState: AuthState = { user: null, isReady: true };
let adminState: AdminState = { isAdmin: false, isChecking: false };

const toastError = vi.fn();

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/useAdmin", () => ({ useIsAdmin: () => adminState }));
vi.mock("sonner", () => ({ toast: { error: (msg: string) => toastError(msg) } }));

const Probe = ({ id }: { id: string }) => {
  const loc = useLocation();
  return <div data-testid={id}>{loc.pathname + loc.search}</div>;
};

const renderAdmin = () =>
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/" element={<Probe id="home" />} />
        <Route path="/auth" element={<Probe id="auth" />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>admin panel</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("AdminRoute", () => {
  beforeEach(() => {
    authState = { user: null, isReady: true };
    adminState = { isAdmin: false, isChecking: false };
    toastError.mockReset();
  });
  afterEach(() => cleanup());

  it("sends signed-out users to /auth with a next param", () => {
    renderAdmin();
    expect(screen.getByTestId("auth").textContent).toBe(`/auth?next=${encodeURIComponent("/admin")}`);
    expect(screen.queryByText("admin panel")).toBeNull();
  });

  it("shows a spinner while the admin check is running", () => {
    authState = { user: { id: "u1" }, isReady: true };
    adminState = { isAdmin: false, isChecking: true };
    const { container } = renderAdmin();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("admin panel")).toBeNull();
    expect(screen.queryByTestId("home")).toBeNull();
  });

  it("redirects signed-in non-admins home and shows a toast", () => {
    authState = { user: { id: "u1" }, isReady: true };
    adminState = { isAdmin: false, isChecking: false };
    renderAdmin();
    expect(screen.getByTestId("home")).toBeTruthy();
    expect(screen.queryByText("admin panel")).toBeNull();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("renders the panel for admins", () => {
    authState = { user: { id: "u1" }, isReady: true };
    adminState = { isAdmin: true, isChecking: false };
    renderAdmin();
    expect(screen.getByText("admin panel")).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });
});
