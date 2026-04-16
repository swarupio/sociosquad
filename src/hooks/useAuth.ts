import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMountedRef.current) {
        setUser(session?.user ?? null);
        setIsReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (isMountedRef.current) {
          setUser(session?.user ?? null);
          if (session?.user) {
            const { user } = session;
            const avatarUrl = user.user_metadata?.avatar_url;
            if (avatarUrl) {
              try {
                await supabase
                  .from('profiles')
                  .update({ avatar_url: avatarUrl })
                  .eq('user_id', user.id);
              } catch (error) {
                console.error('Failed to update profile avatar:', error);
              }
            }
          }
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, isReady, signOut };
}
