import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";

const recommendations = [
  {
    title: "Community Garden Cleanup",
    org: "Green Earth Initiative",
    match: 94,
    tags: ["Environment", "On-Site"],
    reason: "Ghatkopar West, Mumbai · Oct 15, 9:00 AM · 8/15 spots filled",
    urgent: false,
  },
  {
    title: "Blood Donation Camp",
    org: "Helping Hands",
    match: 91,
    tags: ["Health", "On-Site"],
    reason: "DBIT Mumbai · Oct 18, 2:00 PM · 12/20 spots filled",
    urgent: true,
  },
  {
    title: "Beach Cleanup Drive",
    org: "Ocean Warriors",
    match: 87,
    tags: ["Environment", "On-Site"],
    reason: "Versova Beach · Oct 22, 7:00 AM · 20/30 spots filled",
    urgent: false,
  },
];

const AIRecommendations = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-neon-purple/5 rounded-full blur-[200px]" />

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-cyan" />
            <span className="text-sm font-semibold text-cyan uppercase tracking-wider">AI Powered</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Recommended <span className="gradient-text-accent">For You</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mb-12">
            Our AI analyzes your skills, interests, and schedule to find perfect volunteer matches.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recommendations.map((rec, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="glass-card-hover p-6 h-full flex flex-col relative overflow-hidden"
              >
                {rec.urgent && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30">
                    Urgent
                  </div>
                )}
                
                {/* Match percentage */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none" stroke="url(#matchGrad)" strokeWidth="3"
                        strokeDasharray={`${rec.match * 0.94} 100`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--cyan))" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                      {rec.match}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{rec.title}</h3>
                    <p className="text-sm text-muted-foreground">{rec.org}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {rec.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground mb-5 flex-1">
                  <Star className="w-3.5 h-3.5 inline mr-1 text-cyan" />
                  {rec.reason}
                </p>

                <Link to="/opportunities/1" className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 group" style={{ background: "var(--gradient-primary)" }}>
                  Apply Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-2xl font-semibold glass-card text-foreground gradient-border hover:shadow-glow-purple transition-shadow glow-pulse"
            >
              🎲 Surprise Me — Find a Random Match
            </motion.button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AIRecommendations;
