import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncAvatar = (user: User) => {
      const avatarUrl = user.user_metadata?.avatar_url;
      if (!avatarUrl || syncedUserRef.current === user.id) return;
      syncedUserRef.current = user.id;
      // Deferred: never run DB calls inside onAuthStateChange (can deadlock the auth lock).
      setTimeout(() => {
        Promise.resolve(
          supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id)
        ).catch((error) => console.error("Failed to update profile avatar:", error));
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      if (next?.user) syncAvatar(next.user);
      else syncedUserRef.current = null;
      setIsReady(true);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession((prev) => prev ?? data.session ?? null);
      })
      .catch((error) => console.error("Failed to get session:", error))
      .finally(() => {
        if (mounted) setIsReady(true);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isReady,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isReady]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
