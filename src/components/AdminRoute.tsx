import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";

/** UX gate only; the database (RLS + admin RPCs) is the real security boundary. */
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuth();
  const { isAdmin, isChecking } = useIsAdmin();
  const location = useLocation();
  const denied = isReady && !!user && !isChecking && !isAdmin;

  useEffect(() => {
    if (denied) toast.error("You do not have access to the admin panel.");
  }, [denied]);

  if (!isReady || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminRoute;
