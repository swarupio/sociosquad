import { motion } from "framer-motion";
import { TrendingUp, Zap, Clock, Target, Flame, ArrowUpRight, Loader2, CalendarCheck, MapPin, ExternalLink } from "lucide-react";
import { Navigate, Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import AsyncStateCard from "@/components/AsyncStateCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useVolunteerImpact } from "@/hooks/useVolunteerImpact";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const toLocalKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Parse a date-only string (YYYY-MM-DD) as local time to avoid UTC day shifts.
const parseLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

const Dashboard = () => {
  const { user, isReady } = useAuth();
  const location = useLocation();

  const {
    registrations,
    summary,
    isLoading: impactLoading,
    isError: impactHasError,
    error: impactError,
    refetch: refetchImpact,
  } = useVolunteerImpact(user?.id, isReady && !!user);

  const {
    data: activities,
    isLoading: activitiesLoading,
    isError: activitiesHasError,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ["user-activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activities")
        .select("id, action, target, xp, created_at")
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

  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  if (impactLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-3xl" role="status" aria-busy="true">
            <AsyncStateCard title="Loading your dashboard..." loading />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (impactHasError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-3xl">
            <AsyncStateCard
              title="Could not load your dashboard"
              description={impactError instanceof Error ? impactError.message : "Please try again"}
              actionLabel="Retry"
              onAction={() => refetchImpact()}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Volunteer";
  const level = summary.level;
  const xp = summary.xp;
  const xpMax = summary.xpMax;
  const xpPercent = xpMax > 0 ? (xp / xpMax) * 100 : 0;
  const now = new Date();
  const upcomingRegistrations = registrations
    .filter((registration) => {
      if (
        registration.attended ||
        registration.status === "verified" ||
        registration.status === "absent" ||
        Number(registration.hours_credited ?? 0) > 0
      ) {
        return false;
      }

      const eventBoundary = new Date(
        `${registration.date}T${registration.end_time ?? registration.start_time ?? "23:59:59"}`
      );

      return !Number.isNaN(eventBoundary.getTime()) && eventBoundary >= now;
    })
    .sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.start_time ?? "00:00:00"}`).getTime();
      const bTime = new Date(`${b.date}T${b.start_time ?? "00:00:00"}`).getTime();
      return aTime - bTime;
    });

  // Real last-7-days hours from credited registrations (no placeholder data).
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { key: toLocalKey(d), day: d.toLocaleDateString("en-US", { weekday: "short" }), hours: 0 };
  });
  for (const reg of registrations) {
    const hrs = Number(reg.hours_credited ?? 0);
    if (!reg.date || !(hrs > 0)) continue;
    const slot = weeklyData.find((w) => w.key === reg.date);
    if (slot) slot.hours += hrs;
  }
  const hasWeeklyData = weeklyData.some((w) => w.hours > 0);

  const formatTime = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    if (Number.isNaN(t)) return "";
    const diff = Math.max(0, Date.now() - t);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
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
              { icon: Clock, label: "Total Hours", value: summary.totalHours, suffix: "h", color: "text-primary" },
              { icon: Target, label: "Events Completed", value: summary.completedEvents, suffix: "", color: "text-primary" },
              { icon: Flame, label: "Day Streak", value: summary.dayStreak, suffix: "", color: "text-destructive" },
              { icon: TrendingUp, label: "Impact Score", value: summary.impactScore, suffix: "%", color: "text-primary" },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.04}>
                <div className="glass-card p-6 text-center">
                  <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-3`} />
                  <div className="text-2xl font-bold text-primary">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={700} startOnView={false} />
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
                <h3 className="font-semibold text-foreground mb-4">Weekly Impact <span className="text-xs font-normal text-muted-foreground">(hours, last 7 days)</span></h3>
                {!hasWeeklyData ? (
                  <div className="text-center py-16">
                    <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No volunteer hours logged in the last 7 days.</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weeklyData}>
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
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="glass-card p-6 h-full">
                <h3 className="font-semibold text-foreground mb-4">Skill Radar</h3>
                <div className="text-center py-16">
                  <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Your estimated skill profile is available on your portfolio.</p>
                  <Link to="/portfolio" className="text-xs text-primary hover:underline mt-1 inline-block">
                    View skill profile →
                  </Link>
                </div>
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
              {upcomingRegistrations.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRegistrations.map((reg) => {
                    const eventDate = parseLocalDate(reg.date);

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
                                  <span>{reg.start_time.slice(0, 5)}{reg.end_time ? ` – ${reg.end_time.slice(0, 5)}` : ""}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                            Upcoming
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No upcoming registered events yet.</p>
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
              {activitiesHasError ? (
                <div className="text-center py-12">
                  <p className="text-destructive text-sm font-medium">Could not load recent activity</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {activitiesError instanceof Error ? activitiesError.message : "Please try again"}
                  </p>
                  <button
                    onClick={() => refetchActivities()}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                  >
                    Retry
                  </button>
                </div>
              ) : activitiesLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                  <span className="sr-only">Loading recent activity</span>
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((item) => (
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
