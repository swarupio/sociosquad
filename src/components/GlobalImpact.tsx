import { Globe, Activity, Users, TrendingUp } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import AnimatedCounter from "./AnimatedCounter";
import heroVolunteers from "@/assets/hero-volunteers.jpg";
import nssChristmas from "@/assets/nss-christmas.jpeg";

const stats = [
  { icon: Globe, value: 120, suffix: "+", label: "Countries Active", bg: "bg-warm", textColor: "text-warm-foreground" },
  { icon: Activity, value: 2400000, suffix: "+", label: "Hours Volunteered", bg: "bg-teal", textColor: "text-teal-foreground" },
  { icon: Users, value: 50000, suffix: "+", label: "Active Volunteers", bg: "bg-navy", textColor: "text-navy-foreground" },
  { icon: TrendingUp, value: 98, suffix: "%", label: "Satisfaction Rate", bg: "bg-warm", textColor: "text-warm-foreground" },
];

const StatCard = ({ stat }: { stat: typeof stats[number] }) => {
  const Icon = stat.icon;
  return (
    <div className={`${stat.bg} ${stat.textColor} p-8 rounded-3xl text-center h-full flex flex-col items-center justify-center min-h-[200px]`}>
      <Icon className="w-8 h-8 mb-4 opacity-80" />
      <div className={`${stat.value >= 1000000 ? 'text-xl sm:text-2xl md:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-extrabold mb-2`}>
        <AnimatedCounter target={stat.value} suffix={stat.suffix} />
      </div>
      <div className="text-sm font-medium opacity-80">{stat.label}</div>
    </div>
  );
};

const GlobalImpact = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-teal uppercase tracking-wider">Global Impact</span>
            <h2 className="text-4xl md:text-5xl font-extrabold mt-3 mb-4 text-foreground">
              Changing the World, <span className="text-navy">Together</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.slice(0, 2).map((stat, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <StatCard stat={stat} />
            </ScrollReveal>
          ))}

          <ScrollReveal delay={0.2}>
            <div className="rounded-3xl overflow-hidden h-full min-h-[200px]">
              <img src={heroVolunteers} alt="Volunteers in action" className="w-full h-full object-cover" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <StatCard stat={stats[2]} />
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <StatCard stat={stats[3]} />
          </ScrollReveal>

          <ScrollReveal delay={0.5}>
            <div className="rounded-3xl overflow-hidden h-full min-h-[200px]">
              <img src={nssChristmas} alt="Community celebration" className="w-full h-full object-cover" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.6} className="col-span-2">
            <div className="bg-navy text-navy-foreground p-8 rounded-3xl h-full flex flex-col items-center justify-center min-h-[200px] text-center">
              <p className="text-2xl md:text-3xl font-extrabold mb-2">Join the Movement</p>
              <p className="text-sm opacity-70 mb-4">Be part of something bigger than yourself</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default GlobalImpact;
