import { motion } from "framer-motion";
import { TrendingUp, Zap, Clock, Target, Flame, ArrowUpRight, Loader2, CalendarCheck, MapPin, ExternalLink } from "lucide-react";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useMyRegistrations } from "@/hooks/useMyRegistrations";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const skillData = [
  { skill: "Teaching", value: 0 }, { skill: "Coding", value: 0 },
  { skill: "Leadership", value: 0 }, { skill: "Design", value: 0 },
  { skill: "Communication", value: 0 }, { skill: "Organizing", value: 0 },
];

const defaultWeeklyData = [
  { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
  { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
];

const Dashboard = () => {
  const { user, isReady } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
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

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["user-activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isReady && !!user,
  });

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Volunteer";
  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const xpMax = stats?.xp_max ?? 500;
  const xpPercent = xpMax > 0 ? (xp / xpMax) * 100 : 0;

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Header */}
          <ScrollReveal>
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome back, <span className="text-primary">{displayName}</span>
              </h1>
              <p className="text-muted-foreground">Here's your impact overview</p>
            </div>
          </ScrollReveal>

          {/* Impact Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Clock, label: "Total Hours", value: stats?.total_hours ?? 0, suffix: "h", color: "text-primary" },
              { icon: Target, label: "Tasks Completed", value: stats?.tasks_completed ?? 0, suffix: "", color: "text-primary" },
              { icon: Flame, label: "Day Streak", value: stats?.day_streak ?? 0, suffix: "", color: "text-destructive" },
              { icon: TrendingUp, label: "Impact Score", value: stats?.impact_score ?? 0, suffix: "%", color: "text-primary" },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="glass-card p-6 text-center">
                  <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-3`} />
                  <div className="text-2xl font-bold text-primary">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* XP Progress */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground">
                    {level}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Level {level}</p>
                    <p className="text-xs text-muted-foreground">{xp} / {xpMax} XP</p>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ScrollReveal>
              <div className="glass-card p-6 h-full">
                <h3 className="font-semibold text-foreground mb-4">Weekly Impact</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={defaultWeeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="glass-card p-6 h-full">
                <h3 className="font-semibold text-foreground mb-4">Skill Radar</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={skillData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <PolarRadiusAxis stroke="hsl(var(--border))" />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ScrollReveal>
          </div>

          {/* My Registrations */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-primary" /> My Registered Events
                </h3>
                <Link to="/opportunities" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Browse more <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              {registrations && registrations.length > 0 ? (
                <div className="space-y-3">
                  {registrations.map((reg) => {
                    const eventDate = new Date(reg.date);
                    const isPast = eventDate < new Date();
                    const statusColor = reg.attended
                      ? "bg-emerald-100 text-emerald-700"
                      : isPast
                      ? "bg-amber-100 text-amber-700"
                      : "bg-primary/10 text-primary";
                    const statusLabel = reg.attended
                      ? "Attended ✓"
                      : isPast
                      ? "Pending Verification"
                      : "Upcoming";

                    return (
                      <div key={reg.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary uppercase">
                              {eventDate.toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-sm font-bold text-primary leading-none">
                              {eventDate.getDate()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{reg.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{reg.org_name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{reg.location}</span>
                              {reg.start_time && (
                                <>
                                  <span>•</span>
                                  <span>{reg.start_time.slice(0, 5)} – {reg.end_time?.slice(0, 5)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {reg.hours_credited && reg.hours_credited > 0 && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {reg.hours_credited}h credited
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No registered events yet.</p>
                  <Link to="/opportunities" className="text-xs text-primary hover:underline mt-1 inline-block">
                    Explore opportunities →
                  </Link>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Activity Feed */}
          <ScrollReveal>
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
              {activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div>
                          <span className="text-sm text-muted-foreground">{item.action} </span>
                          <span className="text-sm font-medium text-foreground">{item.target}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.xp > 0 && (
                          <span className="text-xs font-semibold text-primary flex items-center gap-1">
                            +{item.xp} XP <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatTime(item.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No activities yet. Start volunteering to build your impact!</p>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
