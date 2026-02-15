import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Leaf, GraduationCap, Stethoscope, Home, Palette } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const causes = [
  { icon: Leaf, label: "Environment", color: "text-green-400", count: "2.4k opportunities", desc: "Climate action, conservation, and sustainability" },
  { icon: GraduationCap, label: "Education", color: "text-cyan", count: "1.8k opportunities", desc: "Mentoring, tutoring, and skill development" },
  { icon: Stethoscope, label: "Healthcare", color: "text-red-400", count: "1.2k opportunities", desc: "Medical aid, mental health, and wellness" },
  { icon: Home, label: "Housing", color: "text-amber-400", count: "890 opportunities", desc: "Shelter, construction, and community building" },
  { icon: Palette, label: "Arts & Culture", color: "text-neon-purple", count: "650 opportunities", desc: "Creative programs, heritage, and expression" },
  { icon: Heart, label: "Humanitarian", color: "text-pink-400", count: "3.1k opportunities", desc: "Crisis relief, food security, and human rights" },
];

const CauseCompass = () => {
  const [selected, setSelected] = useState(0);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan/3 rounded-full blur-[200px]" />

      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-cyan uppercase tracking-wider">Cause Compass</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
              Find Your <span className="gradient-text">Calling</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Discover the cause that resonates with your passion. Every direction leads to impact.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Compass Selector */}
          <ScrollReveal>
            <div className="relative mx-auto w-80 h-80">
              {/* Center glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center glow-pulse">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selected}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {(() => {
                        const Icon = causes[selected].icon;
                        return <Icon className={`w-10 h-10 ${causes[selected].color}`} />;
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Orbiting icons */}
              {causes.map((cause, i) => {
                const angle = (i * 360) / causes.length - 90;
                const rad = (angle * Math.PI) / 180;
                const x = 130 * Math.cos(rad);
                const y = 130 * Math.sin(rad);
                const isActive = selected === i;

                return (
                  <motion.button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? "glass-card border-cyan/40 shadow-glow-cyan scale-110"
                        : "glass-card hover:border-muted-foreground/30"
                    }`}
                    style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                    whileHover={{ scale: isActive ? 1.1 : 1.15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <cause.icon className={`w-6 h-6 ${isActive ? cause.color : "text-muted-foreground"}`} />
                  </motion.button>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Selected cause details */}
          <ScrollReveal delay={0.2}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const Icon = causes[selected].icon;
                    return <Icon className={`w-8 h-8 ${causes[selected].color}`} />;
                  })()}
                  <h3 className="text-2xl font-bold text-foreground">{causes[selected].label}</h3>
                </div>
                <p className="text-muted-foreground mb-4 text-lg">{causes[selected].desc}</p>
                <div className="text-sm text-cyan font-semibold mb-6">{causes[selected].count}</div>
                <button
                  className="px-6 py-3 rounded-xl font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Explore {causes[selected].label}
                </button>
              </motion.div>
            </AnimatePresence>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default CauseCompass;
