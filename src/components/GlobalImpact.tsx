import { Globe, Activity, Users, TrendingUp } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import AnimatedCounter from "./AnimatedCounter";

const stats = [
  { icon: Globe, value: 120, suffix: "+", label: "Countries Active", color: "text-cyan" },
  { icon: Activity, value: 2400000, suffix: "+", label: "Hours Volunteered", color: "text-neon-purple" },
  { icon: Users, value: 50000, suffix: "+", label: "Active Volunteers", color: "text-cyan" },
  { icon: TrendingUp, value: 98, suffix: "%", label: "Satisfaction Rate", color: "text-neon-purple" },
];

const GlobalImpact = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-cyan uppercase tracking-wider">Global Impact</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
              Changing the World, <span className="gradient-text">Together</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="glass-card-hover p-8 text-center">
                <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-4`} />
                <div className={`font-extrabold gradient-text mb-2 ${stat.value >= 1000000 ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'}`}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GlobalImpact;
