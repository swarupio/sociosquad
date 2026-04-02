import { BarChart3, Map, Trophy, Zap, Shield, Users, ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: BarChart3,
    title: "Impact Analytics Dashboard",
    description: "Track your weekly volunteering impact with interactive charts, skill radars, and personal growth insights.",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Trophy,
    title: "Gamification 3.0",
    description: "Earn XP, unlock glowing badges, climb leaderboards, and discover your Volunteer DNA.",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
  {
    icon: Map,
    title: "Interactive Map",
    description: "Explore opportunities on an interactive map with pulsing hotspots and smart filters.",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Join team events and coordinate with fellow volunteers.",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
];

const BentoGrid = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-4">
            <span className="text-sm font-semibold font-body text-primary uppercase tracking-wider">Features</span>
          </div>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mt-3 mb-6 leading-relaxed text-foreground">
              Everything You Need to Make a Difference
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-body">
              Powerful tools designed to amplify your impact and connect you with causes that matter.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="bg-card border border-border rounded-3xl p-8 h-full shadow-soft hover:shadow-lg hover:border-primary/20 transition-all duration-300 group cursor-pointer text-center">
                <div className={`w-16 h-16 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-6 mx-auto`}>
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-display font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm font-body mb-5">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
