import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Only allow same-origin relative paths to avoid open redirects.
const safeNext = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

const AuthCallback = () => {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const oauthError =
    params.get("error_description") || params.get("error") || hashParams.get("error_description") || hashParams.get("error");

  useEffect(() => {
    if (oauthError) return;
    if (isReady && user) {
      navigate(safeNext(params.get("next")), { replace: true });
    }
  }, [isReady, user, oauthError, navigate, params]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const failed = oauthError || (isReady && !user && timedOut);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-card p-12 text-center max-w-md">
        {failed ? (
          <>
            <p className="text-destructive font-medium">Sign-in could not be completed</p>
            {oauthError && <p className="text-muted-foreground text-sm mt-2">{oauthError}</p>}
            <Link to="/auth" className="inline-block mt-4 text-primary underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
