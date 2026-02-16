import { Brain, Map, Trophy, Zap, Shield, Users } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: Brain,
    title: "AI Command Dashboard",
    description: "Track your weekly impact with smart charts, skill radar, and personalized growth insights.",
    span: "col-span-1 md:col-span-2",
    gradient: "from-primary/20 to-cyan/10",
  },
  {
    icon: Trophy,
    title: "Gamification 3.0",
    description: "Earn XP, unlock glowing badges, climb leaderboards, and discover your Volunteer DNA.",
    span: "col-span-1",
    gradient: "from-neon-purple/20 to-primary/10",
  },
  {
    icon: Map,
    title: "Interactive Map",
    description: "Explore opportunities on a dark-themed map with pulsing hotspots and smart filters.",
    span: "col-span-1",
    gradient: "from-cyan/20 to-primary/10",
  },
  {
    icon: Zap,
    title: "Emergency Mode",
    description: "Priority alerts for crisis volunteering when communities need immediate help.",
    span: "col-span-1 md:col-span-2",
    gradient: "from-destructive/15 to-neon-purple/10",
  },
  {
    icon: Shield,
    title: "Skill-to-Impact Converter",
    description: "Map your expertise to real NGO needs and maximize your contribution potential.",
    span: "col-span-1",
    gradient: "from-primary/20 to-neon-purple/10",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Join team events, chat in real-time, and coordinate with fellow volunteers.",
    span: "col-span-1",
    gradient: "from-cyan/15 to-primary/10",
  },
];

const BentoGrid = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
      
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-cyan uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4 leading-tight">
              Everything You Need to <span className="gradient-text">Make a Difference</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to amplify your impact and connect you with causes that matter.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 0.1} className={feature.span}>
              <div className={`glass-card-hover p-8 h-full bg-gradient-to-br ${feature.gradient} group cursor-pointer`}>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:shadow-glow-cyan transition-shadow">
                  <feature.icon className="w-6 h-6 text-cyan" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
