import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

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

export function useSquads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSquads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: allSquads, error } = await supabase
      .from("squads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching squads:", error);
      setLoading(false);
      return;
    }

    const { data: members } = await supabase
      .from("squad_members")
      .select("squad_id, user_id");

    const enriched = (allSquads || []).map((s: any) => {
      const squadMembers = (members || []).filter((m: any) => m.squad_id === s.id);
      return {
        ...s,
        member_count: squadMembers.length,
        is_member: squadMembers.some((m: any) => m.user_id === user.id),
      };
    });

    setSquads(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSquads(); }, [fetchSquads]);

  const createSquad = async (name: string, description: string, emoji: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("squads")
      .insert({ name, description, avatar_emoji: emoji, created_by: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating squad", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-join as leader
    await supabase.from("squad_members").insert({ squad_id: data.id, user_id: user.id, role: "leader" });
    toast({ title: "Squad created! 🎉", description: `Share code: ${data.invite_code}` });
    fetchSquads();
  };

  const joinByCode = async (code: string) => {
    if (!user) return;
    const { data: squad, error } = await supabase
      .from("squads")
      .select("id")
      .eq("invite_code", code.trim().toLowerCase())
      .single();

    if (error || !squad) {
      toast({ title: "Invalid invite code", variant: "destructive" });
      return;
    }

    const { error: joinErr } = await supabase
      .from("squad_members")
      .insert({ squad_id: squad.id, user_id: user.id });

    if (joinErr) {
      toast({ title: joinErr.message.includes("duplicate") ? "Already a member!" : "Error joining", variant: "destructive" });
      return;
    }

    toast({ title: "Joined squad! 🚀" });
    fetchSquads();
  };

  const leaveSquad = async (squadId: string) => {
    if (!user) return;
    await supabase.from("squad_members").delete().eq("squad_id", squadId).eq("user_id", user.id);
    toast({ title: "Left squad" });
    fetchSquads();
  };

  const deleteSquad = async (squadId: string) => {
    if (!user) return;
    const { error } = await supabase.from("squads").delete().eq("id", squadId).eq("created_by", user.id);
    if (error) {
      toast({ title: "Only the creator can delete a squad", variant: "destructive" });
      return;
    }
    toast({ title: "Squad deleted" });
    fetchSquads();
  };

  return { squads, loading, createSquad, joinByCode, leaveSquad, deleteSquad, refetch: fetchSquads };
}

export interface MemberContribution {
  user_id: string;
  contribution: number;
  profile?: { full_name: string | null; avatar_url: string | null };
}

export function useSquadDetail(squadId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [challenges, setChallenges] = useState<(SquadChallenge & { live_progress: number })[]>([]);
  const [contributions, setContributions] = useState<Record<string, MemberContribution[]>>({});
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!squadId || !user) return;
    setLoading(true);

    const [squadRes, membersRes, challengesRes] = await Promise.all([
      supabase.from("squads").select("*").eq("id", squadId).single(),
      supabase.from("squad_members").select("*").eq("squad_id", squadId).order("joined_at"),
      supabase.from("squad_challenges").select("*").eq("squad_id", squadId).order("created_at", { ascending: false }),
    ]);

    if (squadRes.data) setSquad(squadRes.data as any);
    
    let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    if (membersRes.data) {
      const userIds = membersRes.data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      
      (profiles || []).forEach((p: any) => { profilesMap[p.user_id] = p; });
      
      const enriched = membersRes.data.map((m: any) => ({
        ...m,
        profile: profilesMap[m.user_id] || null,
      }));
      setMembers(enriched);
    }

    // Fetch auto-calculated progress for each challenge
    if (challengesRes.data && challengesRes.data.length > 0) {
      const challengesWithProgress = await Promise.all(
        challengesRes.data.map(async (c: any) => {
          const { data: progressData } = await supabase.rpc("get_challenge_progress", { challenge_id: c.id });
          return { ...c, live_progress: (progressData as number) || 0 };
        })
      );
      setChallenges(challengesWithProgress);

      // Fetch per-member contributions for each challenge
      const contribs: Record<string, MemberContribution[]> = {};
      await Promise.all(
        challengesRes.data.map(async (c: any) => {
          const { data } = await supabase.rpc("get_member_contributions", {
            p_squad_id: squadId,
            p_unit: c.unit,
            p_since: c.created_at,
          });
          contribs[c.id] = ((data as any[]) || []).map((d: any) => ({
            ...d,
            profile: profilesMap[d.user_id] || null,
          }));
        })
      );
      setContributions(contribs);
    } else {
      setChallenges([]);
    }

    setLoading(false);
  }, [squadId, user]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const createChallenge = async (title: string, description: string, targetValue: number, unit: string) => {
    if (!user || !squadId) return;
    const { error } = await supabase.from("squad_challenges").insert({
      squad_id: squadId, title, description, target_value: targetValue, unit, created_by: user.id,
    });
    if (error) {
      toast({ title: "Error creating challenge", variant: "destructive" });
      return;
    }
    toast({ title: "Challenge created! 💪" });
    fetchDetail();
  };

  return { squad, members, challenges, contributions, loading, createChallenge, refetch: fetchDetail };
}
