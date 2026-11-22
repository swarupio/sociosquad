import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { checkIsAdmin } from "@/lib/adminApi";

/** UX-only admin check. Real enforcement is in RLS / SECURITY DEFINER RPCs. */
export function useIsAdmin() {
  const { user, isReady } = useAuth();
  const query = useQuery<boolean, Error>({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkIsAdmin(user!.id),
    enabled: isReady && !!user,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    isAdmin: query.data === true,
    isChecking: !isReady || (!!user && query.isLoading),
    error: query.error,
  };
}
