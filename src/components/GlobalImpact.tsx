import { Globe, Activity, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";
import AnimatedCounter from "./AnimatedCounter";
import heroVolunteers from "@/assets/hero-volunteers.jpg";
import nssChristmas from "@/assets/nss-christmas.jpeg";

const stats = [
  { icon: Globe, value: 120, suffix: "+", label: "Countries Active", bg: "bg-accent", textColor: "text-accent-foreground" },
  { icon: Activity, value: 2400000, suffix: "+", label: "Hours Volunteered", bg: "bg-primary", textColor: "text-primary-foreground" },
  { icon: Users, value: 50000, suffix: "+", label: "Active Volunteers", bg: "bg-primary", textColor: "text-primary-foreground" },
  { icon: TrendingUp, value: 98, suffix: "%", label: "Satisfaction Rate", bg: "bg-accent", textColor: "text-accent-foreground" },
];

const StatCard = ({ stat }: { stat: typeof stats[number] }) => {
  const Icon = stat.icon;
  return (
    <div className={`${stat.bg} ${stat.textColor} p-8 rounded-3xl text-center h-full flex flex-col items-center justify-center min-h-[200px]`}>
      <Icon className="w-8 h-8 mb-4 opacity-80" />
      <div className={`${stat.value >= 1000000 ? 'text-xl sm:text-2xl md:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-display font-bold mb-2`}>
        <AnimatedCounter target={stat.value} suffix={stat.suffix} />
      </div>
      <div className="text-sm font-medium font-body opacity-80">{stat.label}</div>
    </div>
  );
};

const GlobalImpact = () => {
  return (
    <section className="py-24 relative bg-secondary">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <span className="text-sm font-semibold font-body text-primary uppercase tracking-wider">Global Impact</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mt-3 mb-4 text-foreground">
                Participate In Charity Around The Whole World
              </h2>
              <p className="text-muted-foreground font-body max-w-lg mb-8">
                Join our community of changemakers and be part of something bigger. Every action counts toward making a difference.
              </p>
              <Link to="/opportunities">
                <motion.span className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold font-body bg-primary text-primary-foreground cursor-pointer">
                  Become Volunteer <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-lg">
              <img src={heroVolunteers} alt="Volunteers in action" className="w-full h-80 object-cover" />
            </div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <StatCard stat={stat} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// Need motion import for the Link span
import { motion } from "framer-motion";

export default GlobalImpact;
