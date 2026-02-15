import { useState } from "react";
import { motion } from "framer-motion";
import { Edit3, Award, MapPin, Calendar, Zap, Star, Shield, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const badges = [
  { name: "First Responder", icon: Shield, earned: true },
  { name: "Team Player", icon: Star, earned: true },
  { name: "Eco Warrior", icon: Heart, earned: true },
  { name: "Code Hero", icon: Zap, earned: true },
  { name: "Mentor", icon: Award, earned: false },
  { name: "Globe Trotter", icon: MapPin, earned: false },
];

const Profile = () => {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("Passionate about tech & sustainability. Full-stack dev by day, volunteer by heart. 🌍");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Profile Header */}
          <ScrollReveal>
            <div className="glass-card p-8 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary-foreground shrink-0" style={{ background: "var(--gradient-accent)" }}>
                  VK
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">Volunteer K.</h1>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                      <Zap className="w-3 h-3" /> Level 12
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> San Francisco</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined Mar 2025</span>
                  </div>
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan/30"
                      />
                      <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground">Save</button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">{bio}</p>
                  )}
                </div>
                <button
                  onClick={() => setEditing(!editing)}
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
              { label: "Total Hours", value: "342" },
              { label: "Projects", value: "28" },
              { label: "Impact Score", value: "94%" },
              { label: "Streak", value: "7 days" },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="glass-card p-5 text-center">
                  <div className="text-xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* XP Bar */}
          <ScrollReveal>
            <div className="glass-card p-6 mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground font-medium">Level 12 Progress</span>
                <span className="text-muted-foreground">2,840 / 3,500 XP</span>
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "81%" }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-primary)" }}
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Badges */}
          <ScrollReveal>
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan" /> Achievements
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {badges.map((badge, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${badge.earned ? "glass-card border-cyan/20" : "opacity-40 glass-card"}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${badge.earned ? "bg-cyan/10" : "bg-secondary"}`}>
                      <badge.icon className={`w-6 h-6 ${badge.earned ? "text-cyan" : "text-muted-foreground"}`} />
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
