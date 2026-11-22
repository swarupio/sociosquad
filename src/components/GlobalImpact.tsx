import { Globe, Activity, Users, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";
import AnimatedCounter from "./AnimatedCounter";
import { siteStats, ILLUSTRATIVE_FOOTNOTE } from "@/lib/siteStats";
import heroVolunteers from "@/assets/hero-volunteers.jpg";

const stats = [
  { icon: Globe, ...siteStats.countries, label: "Countries Active", bg: "bg-accent", textColor: "text-accent-foreground" },
  { icon: Activity, ...siteStats.hoursVolunteered, label: "Hours Volunteered", bg: "bg-primary", textColor: "text-primary-foreground" },
  { icon: Users, ...siteStats.volunteers, label: "Active Volunteers", bg: "bg-primary", textColor: "text-primary-foreground" },
  { icon: TrendingUp, ...siteStats.satisfactionRate, label: "Satisfaction Rate", bg: "bg-accent", textColor: "text-accent-foreground" },
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
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold font-body bg-primary text-primary-foreground cursor-pointer"
                >
                  Become Volunteer <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
            </div>
            {/* Properly framed image - no cropping */}
            <div className="rounded-3xl overflow-hidden shadow-lg">
              <img
                src={heroVolunteers}
                alt="Volunteers in action"
                className="w-full h-auto object-contain"
                loading="lazy"
                decoding="async"
              />
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
        {siteStats.illustrative && (
          <p className="text-xs text-muted-foreground font-body text-center mt-4">{ILLUSTRATIVE_FOOTNOTE}</p>
        )}
      </div>
    </section>
  );
};

export default GlobalImpact;
