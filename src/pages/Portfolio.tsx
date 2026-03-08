import { motion } from "framer-motion";
import {
  Award, Clock, Target, Flame, Zap, Share2, Download, ExternalLink,
  Heart, Shield, Star, MapPin, Linkedin, Copy, Check, Trophy, TrendingUp,
  FileText,
} from "lucide-react";
import { useState, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import ImpactCertificate from "@/components/portfolio/ImpactCertificate";
import { generateVolunteerResume } from "@/components/portfolio/VolunteerResumePDF";
import { Loader2 } from "lucide-react";

const skillData = [
  { skill: "Teaching", value: 72 }, { skill: "Coding", value: 58 },
  { skill: "Leadership", value: 85 }, { skill: "Design", value: 40 },
  { skill: "Communication", value: 90 }, { skill: "Organizing", value: 65 },
];

const causeBreakdown = [
  { cause: "Education", hours: 45, color: "bg-primary" },
  { cause: "Environment", hours: 32, color: "bg-accent" },
  { cause: "Healthcare", hours: 18, color: "bg-teal" },
  { cause: "Community Dev", hours: 25, color: "bg-warm" },
];

const badges = [
  { name: "First Responder", icon: Shield, earned: true, date: "Jan 2026" },
  { name: "Team Captain", icon: Star, earned: true, date: "Feb 2026" },
  { name: "Eco Warrior", icon: Heart, earned: true, date: "Feb 2026" },
  { name: "Code Hero", icon: Zap, earned: false, date: null },
  { name: "Mentor", icon: Award, earned: false, date: null },
  { name: "Globe Trotter", icon: MapPin, earned: false, date: null },
];

const milestones = [
  { title: "100 Volunteer Hours", achieved: true, icon: Clock },
  { title: "10 Events Completed", achieved: true, icon: Target },
  { title: "5 Causes Supported", achieved: true, icon: Heart },
  { title: "30-Day Streak", achieved: false, icon: Flame },
  { title: "Squad Leader", achieved: false, icon: Trophy },
];

const Portfolio = () => {
  const { user, isReady } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  const { data: profile } = useQuery({
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

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Volunteer";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const totalHours = stats?.total_hours ?? 120;
  const tasksCompleted = stats?.tasks_completed ?? 24;
  const impactScore = stats?.impact_score ?? 87;
  const level = stats?.level ?? 5;
  const streak = stats?.day_streak ?? 14;
  const totalCauses = causeBreakdown.length;
  const maxCauseHours = Math.max(...causeBreakdown.map(c => c.hours));

  const shareUrl = `${window.location.origin}/portfolio`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkedIn = () => {
    const text = encodeURIComponent(`🌟 Check out my volunteer impact portfolio on SocioSquad! ${totalHours} hours across ${totalCauses} causes. #Volunteering #SocialImpact`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${text}`, '_blank');
  };

  const handleDownloadResume = () => {
    generateVolunteerResume({
      name: displayName,
      email: user.email || "",
      joinDate,
      level,
      totalHours,
      tasksCompleted,
      impactScore,
      streak,
      causes: causeBreakdown,
      skills: skillData,
      badges,
      milestones,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-5xl">

          {/* Hero Header */}
          <ScrollReveal>
            <div className="relative glass-card p-8 md:p-10 mb-8 overflow-hidden">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: 'var(--gradient-primary)' }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-[0.03]" style={{ background: 'var(--gradient-accent)' }} />

              <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0 shadow-lg"
                >
                  {initials}
                </motion.div>

                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">{displayName}</h1>
                  <p className="text-muted-foreground text-sm mb-3">Volunteer since {joinDate} · Level {level}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                      <Zap className="w-3 h-3" /> Level {level}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground">
                      <Flame className="w-3 h-3 text-accent" /> {streak} Day Streak
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
                      <Trophy className="w-3 h-3" /> {badges.filter(b => b.earned).length} Badges
                    </span>
                  </div>
                </div>

                {/* Share Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy link"
                  >
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLinkedIn}
                    className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Share on LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadResume}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-all"
                  >
                    <FileText className="w-4 h-4" /> Resume
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCertificate(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-105 transition-all"
                  >
                    <Download className="w-4 h-4" /> Certificate
                  </motion.button>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Impact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Clock, label: "Volunteer Hours", value: totalHours, suffix: "h" },
              { icon: Target, label: "Tasks Completed", value: tasksCompleted, suffix: "" },
              { icon: TrendingUp, label: "Impact Score", value: impactScore, suffix: "%" },
              { icon: Heart, label: "Causes Supported", value: totalCauses, suffix: "" },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="glass-card p-5 text-center"
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stat.value}{stat.suffix}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cause Breakdown */}
            <ScrollReveal>
              <div className="glass-card p-6 h-full">
                <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" /> Cause Breakdown
                </h3>
                <div className="space-y-4">
                  {causeBreakdown.map((cause, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium">{cause.cause}</span>
                        <span className="text-muted-foreground">{cause.hours}h</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(cause.hours / maxCauseHours) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.15 }}
                          className={`h-full rounded-full ${cause.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Skill Radar */}
            <ScrollReveal delay={0.1}>
              <div className="glass-card p-6 h-full">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Skill Profile
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={skillData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <PolarRadiusAxis stroke="hsl(var(--border))" domain={[0, 100]} />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ScrollReveal>
          </div>

          {/* Badges */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" /> Achievement Badges
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {badges.map((badge, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: badge.earned ? 1.08 : 1 }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      badge.earned
                        ? "glass-card border-primary/20 shadow-sm"
                        : "opacity-30 bg-secondary/50 rounded-2xl"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      badge.earned ? "bg-primary/10" : "bg-secondary"
                    }`}>
                      <badge.icon className={`w-6 h-6 ${badge.earned ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-xs text-center text-foreground font-medium">{badge.name}</span>
                    {badge.earned && badge.date && (
                      <span className="text-[10px] text-muted-foreground">{badge.date}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Milestones Timeline */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Impact Milestones
              </h3>
              <div className="relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
                <div className="space-y-5">
                  {milestones.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 relative"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                        m.achieved ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        <m.icon className="w-5 h-5" />
                      </div>
                      <div className={`flex-1 py-3 px-4 rounded-xl ${
                        m.achieved ? "bg-primary/5 border border-primary/10" : "bg-secondary/50"
                      }`}>
                        <span className={`text-sm font-medium ${m.achieved ? "text-foreground" : "text-muted-foreground"}`}>
                          {m.title}
                        </span>
                        {m.achieved && (
                          <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            ✓ Achieved
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Share CTA */}
          <ScrollReveal>
            <div className="glass-card p-8 text-center" style={{ background: 'var(--gradient-primary)' }}>
              <Share2 className="w-8 h-8 text-primary-foreground mx-auto mb-3" />
              <h3 className="text-xl font-bold text-primary-foreground mb-2">Share Your Impact</h3>
              <p className="text-primary-foreground/70 text-sm mb-5 max-w-md mx-auto">
                Showcase your volunteer journey. Share with employers, schools, or your network.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLinkedIn}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-foreground text-primary text-sm font-semibold"
                >
                  <Linkedin className="w-4 h-4" /> Share on LinkedIn
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary-foreground/20 text-primary-foreground text-sm font-semibold"
                >
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDownloadResume}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary-foreground/20 text-primary-foreground text-sm font-semibold"
                >
                  <FileText className="w-4 h-4" /> Download Resume
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCertificate(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary-foreground/20 text-primary-foreground text-sm font-semibold"
                >
                  <Download className="w-4 h-4" /> Download Certificate
                </motion.button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />

      {/* Certificate Modal */}
      {showCertificate && (
        <ImpactCertificate
          name={displayName}
          hours={totalHours}
          tasks={tasksCompleted}
          causes={totalCauses}
          level={level}
          joinDate={joinDate}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};

export default Portfolio;
