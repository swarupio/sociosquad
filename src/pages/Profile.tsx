import { useState } from "react";
import { motion } from "framer-motion";
import { Edit3, Award, MapPin, Calendar, Zap, Star, Shield, Heart, Loader2, Save, CalendarCheck } from "lucide-react";
import { Navigate, Link } from "react-router-dom";
import { useMyRegistrations } from "@/hooks/useMyRegistrations";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const badges = [
  { name: "First Responder", icon: Shield, earned: false },
  { name: "Team Player", icon: Star, earned: false },
  { name: "Eco Warrior", icon: Heart, earned: false },
  { name: "Code Hero", icon: Zap, earned: false },
  { name: "Mentor", icon: Award, earned: false },
  { name: "Globe Trotter", icon: MapPin, earned: false },
];

const Profile = () => {
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user,
  });

  const { data: registrations } = useMyRegistrations(user?.id);

  const updateProfile = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newName })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setEditing(false);
    },
  });

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const xpMax = stats?.xp_max ?? 500;
  const xpPercent = xpMax > 0 ? (xp / xpMax) * 100 : 0;

  const handleSave = () => {
    if (editName.trim()) {
      updateProfile.mutate(editName.trim());
    } else {
      setEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Profile Header */}
          <ScrollReveal>
            <div className="glass-card p-8 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0">
                  {initials}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    {editing ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-secondary text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border"
                          placeholder="Your name"
                          autoFocus
                        />
                        <button
                          onClick={handleSave}
                          disabled={updateProfile.isPending}
                          className="p-2 rounded-xl bg-primary text-primary-foreground hover:brightness-105 transition-all"
                        >
                          {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                      <Zap className="w-3 h-3" /> Level {level}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {joinDate}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
                <button
                  onClick={() => { setEditing(!editing); setEditName(displayName); }}
                  className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Hours", value: `${stats?.total_hours ?? 0}` },
              { label: "Tasks Done", value: `${stats?.tasks_completed ?? 0}` },
              { label: "Impact Score", value: `${stats?.impact_score ?? 0}%` },
              { label: "Streak", value: `${stats?.day_streak ?? 0} days` },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="glass-card p-5 text-center">
                  <div className="text-xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* XP Bar */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground font-medium">Level {level} Progress</span>
                <span className="text-muted-foreground">{xp} / {xpMax} XP</span>
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Upcoming Registrations */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" /> My Registered Events
              </h3>
              {registrations && registrations.length > 0 ? (
                <div className="space-y-3">
                  {registrations.slice(0, 5).map((reg) => {
                    const eventDate = new Date(reg.date);
                    const isPast = eventDate < new Date();
                    return (
                      <div key={reg.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary uppercase">
                              {eventDate.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-xs font-bold text-primary leading-none">
                              {eventDate.getDate()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{reg.title}</p>
                            <p className="text-xs text-muted-foreground">{reg.org_name} • {reg.category}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          reg.attended ? "bg-emerald-100 text-emerald-700" : isPast ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                        }`}>
                          {reg.attended ? "Attended" : isPast ? "Pending" : "Upcoming"}
                        </span>
                      </div>
                    );
                  })}
                  {registrations.length > 5 && (
                    <Link to="/dashboard" className="text-xs text-primary hover:underline block text-center mt-2">
                      View all {registrations.length} registrations →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No registrations yet.</p>
                  <Link to="/opportunities" className="text-xs text-primary hover:underline mt-1 inline-block">
                    Explore opportunities →
                  </Link>
                </div>
              )}
            </div>
          </ScrollReveal>


          <ScrollReveal>
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" /> Achievements
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {badges.map((badge, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${badge.earned ? "glass-card border-primary/20" : "opacity-40 glass-card"}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${badge.earned ? "bg-primary/10" : "bg-secondary"}`}>
                      <badge.icon className={`w-6 h-6 ${badge.earned ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-xs text-center text-muted-foreground font-medium">{badge.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
