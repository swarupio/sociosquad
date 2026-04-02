import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedCounter from "./AnimatedCounter";
import heroTreePlanting from "@/assets/hero-tree-planting.jpg";
import heroFoodDrive from "@/assets/hero-food-drive.jpg";
import heroTeaching from "@/assets/hero-teaching.jpg";
import heroBeachCleanup from "@/assets/hero-beach-cleanup.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1] text-foreground">
              Do Something Great To Help Others
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed font-body">
              Our smart platform connects your specific skills to the causes that need you most — turning good intentions into real-world results.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/opportunities">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 justify-center px-8 py-4 rounded-full font-semibold font-body bg-primary text-primary-foreground cursor-pointer text-base"
                >
                  Start Volunteering <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
              <Link to="/opportunities">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold font-body border-2 border-primary text-primary hover:bg-primary/5 transition-colors cursor-pointer text-base"
                >
                  Explore Causes
                </motion.span>
              </Link>
            </div>

            {/* Impact Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 flex gap-10"
            >
              {[
                { value: 15, suffix: "K+", label: "Active Volunteers" },
                { value: 100, suffix: "+", label: "Countries" },
                { value: 600, suffix: "+", label: "NGO Partners" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground font-body">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Image collage with proper circular framing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative w-[480px] h-[480px]">
              {/* Top-right: Large circle */}
              <div className="absolute top-0 right-0 w-[220px] h-[220px] rounded-full overflow-hidden border-[5px] border-background shadow-xl">
                <img src={heroTreePlanting} alt="Volunteers planting trees" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-12 left-4 w-[170px] h-[170px] rounded-full overflow-hidden border-[5px] border-background shadow-xl">
                <img src={heroFoodDrive} alt="Food drive volunteers" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-12 right-8 w-[190px] h-[190px] rounded-full overflow-hidden border-[5px] border-background shadow-xl">
                <img src={heroTeaching} alt="Teaching volunteers" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-4 left-12 w-[150px] h-[150px] rounded-full overflow-hidden border-[5px] border-background shadow-xl">
                <img src={heroBeachCleanup} alt="Beach cleanup volunteers" className="w-full h-full object-cover" />
              </div>

              {/* Decorative dots */}
              <div className="absolute top-2 left-[45%] w-4 h-4 rounded-full bg-accent" />
              <div className="absolute bottom-[45%] right-0 w-3 h-3 rounded-full bg-primary/30" />
              <div className="absolute bottom-0 left-[40%] w-2.5 h-2.5 rounded-full bg-accent/60" />
              <div className="absolute top-[55%] left-0 w-2 h-2 rounded-full bg-primary/20" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
