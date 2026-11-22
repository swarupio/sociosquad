import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import type { Tables } from "@/integrations/supabase/types";

export interface Squad {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  avatar_emoji: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

export interface ActivityLog {
  id: string;
  squad_id: string;
  challenge_id: string;
  user_id: string;
  description: string;
  value: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

export interface SquadChallenge {
  id: string;
  squad_id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  created_by: string;
  created_at: string;
  ends_at: string | null;
}

const SQUAD_COLUMNS = "id, name, description, invite_code, avatar_emoji, created_by, created_at";

const errText = (e: unknown): string =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";

const isMissingFunction = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "PGRST202" || (e.message ?? "").includes("Could not find the function"));

type RpcError = { code?: string; message?: string } | null;

/** Typed wrapper for RPCs not present in the generated types. */
const callRpc = (name: string, args: Record<string, unknown>): Promise<{ error: RpcError }> =>
  (supabase as unknown as {
    rpc: (n: string, a: Record<string, unknown>) => Promise<{ error: RpcError }>;
  }).rpc(name, args);

export function useSquads() {
  const { user, isReady } = useAuth();
  const { toast } = useToast();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const cancelPending = useCallback(() => { requestRef.current++; }, []); // request counter, not a DOM node

  const fetchSquads = useCallback(async () => {
    const reqId = ++requestRef.current;
    if (!user) {
      setSquads([]);
      setError(null);
      if (isReady) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Only the squads this user belongs to
      const { data: mine, error: mineErr } = await supabase
        .from("squad_members")
        .select("squad_id")
        .eq("user_id", user.id);
      if (mineErr) throw mineErr;
      const squadIds = [...new Set((mine || []).map((m) => m.squad_id))];

      if (squadIds.length === 0) {
        if (reqId !== requestRef.current) return;
        setSquads([]);
        return;
      }

      const [squadsRes, countsRes] = await Promise.all([
        supabase.from("squads").select(SQUAD_COLUMNS).in("id", squadIds).order("created_at", { ascending: false }),
        supabase.from("squad_members").select("squad_id").in("squad_id", squadIds),
      ]);
      if (squadsRes.error) throw squadsRes.error;
      if (countsRes.error) throw countsRes.error;

      const counts: Record<string, number> = {};
      (countsRes.data || []).forEach((m) => { counts[m.squad_id] = (counts[m.squad_id] || 0) + 1; });

      if (reqId !== requestRef.current) return;
      setSquads(
        (squadsRes.data || []).map((s) => ({
          ...s,
          member_count: counts[s.id] || 1,
          is_member: true,
        }))
      );
    } catch (e) {
      if (reqId !== requestRef.current) return;
      console.error("Error fetching squads:", e);
      setError(errText(e));
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [user, isReady]);

  useEffect(() => {
    fetchSquads();
    return cancelPending;
  }, [fetchSquads, cancelPending]);

  const createSquad = async (name: string, description: string, emoji: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error: insErr } = await supabase
      .from("squads")
      .insert({ name: name.trim(), description: description.trim(), avatar_emoji: emoji, created_by: user.id })
      .select()
      .single();

    if (insErr || !data) {
      toast({ title: "Error creating squad", description: insErr ? insErr.message : undefined, variant: "destructive" });
      return false;
    }

    // Auto-join as leader
    const { error: leaderErr } = await supabase
      .from("squad_members")
      .insert({ squad_id: data.id, user_id: user.id, role: "leader" });
    if (leaderErr) {
      // Don't leave an orphan squad with no leader behind
      await supabase.from("squads").delete().eq("id", data.id).eq("created_by", user.id);
      toast({ title: "Error creating squad", description: leaderErr.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Squad created! 🎉", description: `Share code: ${data.invite_code}` });
    await fetchSquads();
    return true;
  };

  const joinByCode = async (code: string): Promise<boolean> => {
    if (!user) return false;
    const cleaned = code.trim().toLowerCase();
    if (!cleaned) return false;

    const reportJoinError = (e: { message?: string; code?: string }) => {
      const msg = (e.message ?? "").toLowerCase();
      if (e.code === "23505" || msg.includes("duplicate") || msg.includes("already")) {
        toast({ title: "Already a member!", variant: "destructive" });
      } else if (msg.includes("invalid") || msg.includes("not found")) {
        toast({ title: "Invalid invite code", variant: "destructive" });
      } else {
        toast({ title: "Error joining", description: e.message, variant: "destructive" });
      }
    };

    // Preferred: server-side RPC
    const { error: rpcErr } = await callRpc("join_squad_by_code", { p_code: cleaned });
    if (!rpcErr) {
      toast({ title: "Joined squad! 🚀" });
      await fetchSquads();
      return true;
    }
    if (!isMissingFunction(rpcErr)) {
      reportJoinError(rpcErr);
      return false;
    }

    // Fallback for databases without the RPC
    const { data: squad, error: lookupErr } = await supabase
      .from("squads")
      .select("id")
      .eq("invite_code", cleaned)
      .maybeSingle();

    if (lookupErr) {
      toast({ title: "Error joining", description: lookupErr.message, variant: "destructive" });
      return false;
    }
    if (!squad) {
      toast({ title: "Invalid invite code", variant: "destructive" });
      return false;
    }

    const { error: joinErr } = await supabase
      .from("squad_members")
      .insert({ squad_id: squad.id, user_id: user.id });

    if (joinErr) {
      reportJoinError(joinErr);
      return false;
    }

    toast({ title: "Joined squad! 🚀" });
    await fetchSquads();
    return true;
  };

  const leaveSquad = async (squadId: string): Promise<boolean> => {
    if (!user) return false;
    const { error: delErr } = await supabase.from("squad_members").delete().eq("squad_id", squadId).eq("user_id", user.id);
    if (delErr) {
      toast({ title: "Error leaving squad", description: delErr.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Left squad" });
    await fetchSquads();
    return true;
  };

  const deleteSquad = async (squadId: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error: delErr } = await supabase
      .from("squads")
      .delete()
      .eq("id", squadId)
      .eq("created_by", user.id)
      .select("id");
    if (delErr || !data || data.length === 0) {
      toast({
        title: "Couldn't delete squad",
        description: delErr ? delErr.message : "Only the creator can delete a squad",
        variant: "destructive",
      });
      return false;
    }
    toast({ title: "Squad deleted" });
    await fetchSquads();
    return true;
  };

  return { squads, loading, error, createSquad, joinByCode, leaveSquad, deleteSquad, refetch: fetchSquads };
}

export interface MemberContribution {
  user_id: string;
  contribution: number;
  profile?: { full_name: string | null; avatar_url: string | null };
}

export function useSquadDetail(squadId: string | undefined) {
  const { user, isReady } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [challenges, setChallenges] = useState<(SquadChallenge & { live_progress: number })[]>([]);
  const [contributions, setContributions] = useState<Record<string, MemberContribution[]>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const requestRef = useRef(0);
  const cancelPending = useCallback(() => { requestRef.current++; }, []); // request counter, not a DOM node

  const fetchDetail = useCallback(async () => {
    const reqId = ++requestRef.current;
    if (!squadId || !user) {
      setSquad(null);
      if (isReady || !squadId) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [squadRes, membersRes, challengesRes, logsRes] = await Promise.all([
        supabase.from("squads").select(SQUAD_COLUMNS).eq("id", squadId).maybeSingle(),
        supabase.from("squad_members").select("id, squad_id, user_id, role, joined_at").eq("squad_id", squadId).order("joined_at"),
        supabase.from("squad_challenges").select("id, squad_id, title, description, category, target_value, current_value, unit, status, created_by, created_at, ends_at").eq("squad_id", squadId).order("created_at", { ascending: false }),
        supabase.from("squad_activity_logs").select("id, squad_id, challenge_id, user_id, description, value, status, reviewed_by, reviewed_at, created_at").eq("squad_id", squadId).order("created_at", { ascending: false }),
      ]);
      if (squadRes.error) throw squadRes.error;
      if (membersRes.error) throw membersRes.error;
      if (challengesRes.error) throw challengesRes.error;
      if (logsRes.error) throw logsRes.error;

      const memberRows: Tables<"squad_members">[] = membersRes.data || [];
      const profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      const userIds = [...new Set(memberRows.map((m) => m.user_id as string))];
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        if (profErr) console.error("Error fetching profiles:", profErr);
        (profiles || []).forEach((p) => { profilesMap[p.user_id] = p; });
      }

      const enrichedMembers = memberRows.map((m) => ({ ...m, profile: profilesMap[m.user_id] || undefined }));
      const enrichedLogs = (logsRes.data || []).map((l) => ({ ...l, profile: profilesMap[l.user_id] || undefined }));

      const challengeRows: Tables<"squad_challenges">[] = challengesRes.data || [];
      // Progress and per-member contributions are derived from the logs already fetched above,
      // replacing two RPC round-trips per challenge.
      const approvedByChallenge = new Map<string, Map<string, number>>();
      (logsRes.data || []).forEach((l) => {
        if (l.status !== "approved" || !l.challenge_id) return;
        const perMember = approvedByChallenge.get(l.challenge_id) ?? new Map<string, number>();
        perMember.set(l.user_id, (perMember.get(l.user_id) ?? 0) + Number(l.value || 0));
        approvedByChallenge.set(l.challenge_id, perMember);
      });
      const contribs: Record<string, MemberContribution[]> = {};
      const withProgress = challengeRows.map((c) => {
        const perMember = approvedByChallenge.get(c.id) ?? new Map<string, number>();
        let total = 0;
        perMember.forEach((v) => { total += v; });
        contribs[c.id] = memberRows.map((m) => ({
          user_id: m.user_id,
          contribution: perMember.get(m.user_id) ?? 0,
          profile: profilesMap[m.user_id] || undefined,
        }));
        return { ...c, live_progress: total };
      });

      if (reqId !== requestRef.current) return;
      setSquad((squadRes.data as Squad | null) ?? null);
      setMembers(enrichedMembers);
      setIsLeader(enrichedMembers.some((m) => m.user_id === user.id && m.role === "leader"));
      setActivityLogs(enrichedLogs);
      setChallenges(withProgress);
      setContributions(contribs);
    } catch (e) {
      if (reqId !== requestRef.current) return;
      console.error("Error fetching squad detail:", e);
      setError(errText(e));
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [squadId, user, isReady]);

  useEffect(() => {
    fetchDetail();
    return cancelPending;
  }, [fetchDetail, cancelPending]);

  const createChallenge = async (title: string, description: string, targetValue: number, unit: string): Promise<boolean> => {
    if (!user || !squadId) return false;
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      toast({ title: "Target must be greater than 0", variant: "destructive" });
      return false;
    }
    const { error: insErr } = await supabase.from("squad_challenges").insert({
      squad_id: squadId, title: title.trim(), description, target_value: targetValue, unit, created_by: user.id,
    });
    if (insErr) {
      toast({ title: "Error creating challenge", description: insErr.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Challenge created! 💪" });
    await fetchDetail();
    return true;
  };

  const submitActivity = async (challengeId: string, description: string, value: number): Promise<boolean> => {
    if (!user || !squadId) return false;
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Amount must be greater than 0", variant: "destructive" });
      return false;
    }
    const { error: insErr } = await supabase.from("squad_activity_logs").insert({
      squad_id: squadId, challenge_id: challengeId, user_id: user.id, description: description.trim(), value,
    });
    if (insErr) {
      toast({ title: "Error submitting activity", description: insErr.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Activity submitted for approval ✅" });
    await fetchDetail();
    return true;
  };

  const reviewActivity = async (logId: string, approve: boolean): Promise<boolean> => {
    if (!user) return false;
    const { error: upErr } = await supabase
      .from("squad_activity_logs")
      .update({ status: approve ? "approved" : "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", logId);
    if (upErr) {
      toast({ title: "Error reviewing activity", description: upErr.message, variant: "destructive" });
      return false;
    }
    toast({ title: approve ? "Activity approved! ✅" : "Activity rejected" });
    await fetchDetail();
    return true;
  };

  return { squad, members, challenges, contributions, activityLogs, isLeader, loading, error, createChallenge, submitActivity, reviewActivity, refetch: fetchDetail };
}
