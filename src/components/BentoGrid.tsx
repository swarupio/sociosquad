import { Brain, Map, Trophy, Zap, Shield, Users } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: Brain,
    title: "AI Command Dashboard",
    description: "Track your weekly impact with smart charts, skill radar, and personalized growth insights.",
    span: "col-span-1 md:col-span-2",
    iconBg: "bg-teal/10",
    iconColor: "text-teal",
  },
  {
    icon: Trophy,
    title: "Gamification 3.0",
    description: "Earn XP, unlock glowing badges, climb leaderboards, and discover your Volunteer DNA.",
    span: "col-span-1",
    iconBg: "bg-warm/10",
    iconColor: "text-warm",
  },
  {
    icon: Map,
    title: "Interactive Map",
    description: "Explore opportunities on an interactive map with pulsing hotspots and smart filters.",
    span: "col-span-1",
    iconBg: "bg-navy/10",
    iconColor: "text-navy",
  },
  {
    icon: Zap,
    title: "Emergency Mode",
    description: "Priority alerts for crisis volunteering when communities need immediate help.",
    span: "col-span-1 md:col-span-2",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  {
    icon: Shield,
    title: "Skill-to-Impact Converter",
    description: "Map your expertise to real NGO needs and maximize your contribution potential.",
    span: "col-span-1 md:col-span-2",
    iconBg: "bg-teal/10",
    iconColor: "text-teal",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Join team events, chat in real-time, and coordinate with fellow volunteers.",
    span: "col-span-1",
    iconBg: "bg-warm/10",
    iconColor: "text-warm",
  },
];

const BentoGrid = () => {
  return (
    <section className="py-24 relative bg-secondary">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-teal uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3 mb-6 leading-relaxed text-foreground">
              Everything You Need to <span className="text-navy">Make a Difference</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to amplify your impact and connect you with causes that matter.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 0.1} className={feature.span}>
              <div className="bg-card border border-border rounded-2xl p-10 h-full shadow-md hover:shadow-lg hover:border-teal/20 transition-all duration-300 group cursor-pointer">
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
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
