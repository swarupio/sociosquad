import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, TrendingUp, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const globalLeaders = [
  { rank: 1, name: "Swarup", city: "Mumbai", xp: 12400, hours: 580, level: 24 },
  { rank: 2, name: "Suhani", city: "Mumbai", xp: 11200, hours: 520, level: 22 },
  { rank: 3, name: "Gururaj", city: "Mumbai", xp: 10800, hours: 490, level: 21 },
  { rank: 4, name: "Phillon", city: "Mumbai", xp: 9600, hours: 440, level: 19 },
  { rank: 5, name: "Aayush N", city: "Mumbai", xp: 9200, hours: 410, level: 18 },
  { rank: 6, name: "Pramit", city: "Mumbai", xp: 8800, hours: 390, level: 17 },
  { rank: 7, name: "Chaitanya", city: "Mumbai", xp: 8400, hours: 370, level: 17 },
  { rank: 8, name: "Aayush B", city: "Mumbai", xp: 7900, hours: 350, level: 16 },
  { rank: 9, name: "Pushkar", city: "Mumbai", xp: 7500, hours: 330, level: 15 },
  { rank: 10, name: "Jeevan", city: "Mumbai", xp: 7100, hours: 310, level: 14 },
  { rank: 11, name: "Nilay", city: "Mumbai", xp: 6700, hours: 290, level: 13 },
  { rank: 12, name: "Jishnu", city: "Mumbai", xp: 6300, hours: 270, level: 12 },
  { rank: 13, name: "Tanmay", city: "Mumbai", xp: 5900, hours: 250, level: 11 },
  { rank: 14, name: "Soham", city: "Mumbai", xp: 5500, hours: 230, level: 10, isUser: true },
];

const Leaderboard = () => {
  const [tab, setTab] = useState<"global" | "city">("global");

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-cyan" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-neon-purple" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

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
              {(["global", "city"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "global" ? "🌍 Global" : "🏙️ City"}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {/* Top 3 Podium */}
          <ScrollReveal>
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
              {[globalLeaders[1], globalLeaders[0], globalLeaders[2]].map((leader, i) => {
                const heights = ["h-28", "h-36", "h-24"];
                return (
                  <div key={leader.rank} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground mb-2" style={{ background: "var(--gradient-accent)" }}>
                      {leader.name.split(" ").map(n => n[0]).join("")}
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
              {globalLeaders.map((leader, i) => (
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{leader.city}</p>
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
