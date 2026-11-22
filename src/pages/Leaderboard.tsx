import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, TrendingUp, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

interface LeaderEntry {
  rank: number;
  name: string;
  city: string;
  xp: number;
  hours: number;
  level: number;
  isUser?: boolean;
}

const LEADERBOARD_LIMIT = 50;

const toEntry = (row: any, i: number, myId?: string): LeaderEntry => ({
  rank: i + 1,
  name: row.full_name || row.name || "Volunteer",
  city: row.city || "",
  xp: row.xp || 0,
  hours: row.total_hours ?? row.hours ?? 0,
  level: row.level || 1,
  isUser: !!myId && row.user_id === myId,
});

async function loadLeaders(myId?: string): Promise<LeaderEntry[]> {
  // Preferred: server-side RPC (joins profiles safely). Falls back to direct query.
  const rpc = await (supabase as any).rpc("get_leaderboard", { limit_count: LEADERBOARD_LIMIT });
  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data.map((r: any, i: number) => toEntry(r, i, myId));
  }

  const { data: statsData, error } = await supabase
    .from("user_stats")
    .select("user_id, xp, total_hours, level")
    .order("xp", { ascending: false })
    .limit(LEADERBOARD_LIMIT);
  if (error) throw error;
  if (!statsData || statsData.length === 0) return [];

  const userIds = statsData.map((s: any) => s.user_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);
  if (pErr) throw pErr;
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
  return statsData.map((s: any, i: number) => toEntry({ ...s, full_name: profileMap.get(s.user_id) }, i, myId));
}

const Leaderboard = () => {
  const { user, isReady } = useAuth();
  const [realLeaders, setRealLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadLeaders(user?.id)
      .then((l) => { if (!cancelled) setRealLeaders(l); })
      .catch((e) => { if (!cancelled) setError(e?.message || "Could not load the leaderboard."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isReady, user, attempt]);

  const isLoggedIn = isReady && !!user;
  const leaders = realLeaders;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-cyan" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-neon-purple" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const topThree = leaders.length >= 3 ? [leaders[1], leaders[0], leaders[2]] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <ScrollReveal>
            <div className="text-center mb-10">
              <Trophy className="w-10 h-10 text-cyan mx-auto mb-4" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                <span className="gradient-text">Leaderboard</span>
              </h1>
              <p className="text-muted-foreground">Top volunteers making the biggest impact</p>
            </div>
          </ScrollReveal>

          {/* Tabs */}
          <ScrollReveal>
            <div className="flex justify-center gap-2 mb-8">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-primary text-primary-foreground"
                aria-pressed="true"
              >
                🌍 Global
              </button>
              <button
                disabled
                title="City rankings are coming soon"
                aria-label="City rankings (coming soon)"
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
              >
                🏙️ City
              </button>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="glass-card p-16 text-center">
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </div>
          ) : error ? (
            <div className="glass-card p-16 text-center" role="alert">
              <h3 className="text-lg font-semibold text-foreground mb-2">Could not load the leaderboard</h3>
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
              >
                Retry
              </button>
            </div>
          ) : leaders.length === 0 ? (
            <ScrollReveal>
              <div className="glass-card p-16 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No rankings yet</h3>
                <p className="text-muted-foreground text-sm">
                  {isLoggedIn
                    ? "Start volunteering to appear on the leaderboard! Complete tasks and earn XP to climb the ranks."
                    : "Sign in to see the leaderboard and start earning XP."}
                </p>
                {!isLoggedIn && (
                  <Link to="/auth" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground">
                    Sign in
                  </Link>
                )}
              </div>
            </ScrollReveal>
          ) : (
            <>
              {/* Top 3 Podium */}
              {topThree.length === 3 && (
                <ScrollReveal>
                  <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
                    {topThree.map((leader, i) => {
                      const heights = ["h-28", "h-36", "h-24"];
                      return (
                        <div key={leader.rank} className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground mb-2" style={{ background: "var(--gradient-accent)" }}>
                            {leader.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <p className="text-xs font-semibold text-foreground text-center truncate w-full">{leader.name}</p>
                          <p className="text-xs text-muted-foreground mb-2">{leader.xp.toLocaleString()} XP</p>
                          <div className={`w-full ${heights[i]} rounded-t-xl flex items-end justify-center pb-3`} style={{ background: "var(--gradient-primary)", opacity: i === 1 ? 1 : 0.6 }}>
                            <span className="text-xl font-bold text-primary-foreground">{leader.rank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollReveal>
              )}

              {/* Full List */}
              <ScrollReveal>
                <div className="glass-card overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 border-b border-border/50 text-xs text-muted-foreground font-medium">
                    <span>Rank</span>
                    <span>Volunteer</span>
                    <span className="hidden md:block">Hours</span>
                    <span>Level</span>
                    <span>XP</span>
                  </div>
                  {leaders.map((leader, i) => (
                    <motion.div
                      key={leader.rank}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 items-center border-b border-border/30 last:border-0 transition-colors ${leader.isUser ? "bg-cyan/5 border-cyan/20" : "hover:bg-secondary/30"}`}
                    >
                      <div className="w-8 flex justify-center">{getRankIcon(leader.rank)}</div>
                      <div>
                        <p className={`text-sm font-medium ${leader.isUser ? "gradient-text" : "text-foreground"}`}>{leader.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{leader.city || "—"}</p>
                      </div>
                      <span className="hidden md:block text-sm text-muted-foreground">{leader.hours}h</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-secondary text-foreground">Lv.{leader.level}</span>
                      <span className="text-sm font-bold gradient-text flex items-center gap-1">
                        {leader.xp.toLocaleString()} <TrendingUp className="w-3 h-3" />
                      </span>
                    </motion.div>
                  ))}
                </div>
              </ScrollReveal>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
