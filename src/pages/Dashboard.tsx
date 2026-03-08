import { motion } from "framer-motion";
import { TrendingUp, Zap, Clock, Target, Flame, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const weeklyData = [
  { day: "Mon", hours: 2 }, { day: "Tue", hours: 4 }, { day: "Wed", hours: 1 },
  { day: "Thu", hours: 5 }, { day: "Fri", hours: 3 }, { day: "Sat", hours: 7 }, { day: "Sun", hours: 4 },
];

const skillData = [
  { skill: "Teaching", value: 85 }, { skill: "Coding", value: 92 },
  { skill: "Leadership", value: 70 }, { skill: "Design", value: 60 },
  { skill: "Communication", value: 88 }, { skill: "Organizing", value: 75 },
];

const activityFeed = [
  { action: "Completed", target: "Ocean Cleanup Drive", time: "2h ago", xp: 120 },
  { action: "Joined", target: "Code for Good Hackathon", time: "5h ago", xp: 50 },
  { action: "Earned badge", target: "First Responder", time: "1d ago", xp: 200 },
  { action: "Leveled up", target: "Level 12", time: "2d ago", xp: 0 },
  { action: "Completed", target: "Youth Mentorship Session", time: "3d ago", xp: 80 },
];

const Dashboard = () => {
  const level = 12;
  const xp = 2840;
  const xpMax = 3500;
  const xpPercent = (xp / xpMax) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Header */}
          <ScrollReveal>
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome back, <span className="gradient-text">Volunteer</span>
              </h1>
              <p className="text-muted-foreground">Here's your impact this week</p>
            </div>
          </ScrollReveal>

          {/* Impact Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Clock, label: "Hours This Week", value: 26, suffix: "h", color: "text-cyan" },
              { icon: Target, label: "Tasks Completed", value: 14, suffix: "", color: "text-neon-purple" },
              { icon: Flame, label: "Day Streak", value: 7, suffix: "🔥", color: "text-destructive" },
              { icon: TrendingUp, label: "Impact Score", value: 94, suffix: "%", color: "text-cyan" },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="glass-card p-6 text-center">
                  <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-3`} />
                  <div className="text-2xl font-bold gradient-text">
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    {level}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Level {level}</p>
                    <p className="text-xs text-muted-foreground">{xp} / {xpMax} XP</p>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-cyan" />
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-primary)" }}
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
                    <Radar dataKey="value" stroke="hsl(var(--cyan))" fill="hsl(var(--cyan))" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ScrollReveal>
          </div>

          {/* Activity Feed */}
          <ScrollReveal>
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {activityFeed.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan" />
                      <div>
                        <span className="text-sm text-muted-foreground">{item.action} </span>
                        <span className="text-sm font-medium text-foreground">{item.target}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.xp > 0 && (
                        <span className="text-xs font-semibold text-cyan flex items-center gap-1">
                          +{item.xp} XP <ArrowUpRight className="w-3 h-3" />
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
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

export default Dashboard;
