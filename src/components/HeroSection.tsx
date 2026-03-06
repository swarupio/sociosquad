import { motion } from "framer-motion";
import { ArrowRight, Globe, Users, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedCounter from "./AnimatedCounter";
import heroVolunteers from "@/assets/hero-volunteers.jpg";
import nssChristmas from "@/assets/nss-christmas.jpeg";
import nss7daysCamp from "@/assets/nss-7days-camp.jpeg";
import nssDiwali from "@/assets/nss-diwali.jpeg";

const HeroSection = () => {
  return (
    <section className="relative pt-20 pb-12">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1] text-foreground">
              Do Something{" "}
              <span className="text-primary">Great</span> To Help Others
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed font-body">
              SocioSquad is a global volunteering platform in Mumbai. AI matches your skills to causes that need you most — turning good intentions into real-world results.
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

          {/* Right: Image collage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Large circular image */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full overflow-hidden border-4 border-background shadow-lg">
                <img src={heroVolunteers} alt="Volunteers at beach cleanup" className="w-full h-full object-cover" />
              </div>
              {/* Medium circular image */}
              <div className="absolute bottom-8 right-12 w-48 h-48 rounded-full overflow-hidden border-4 border-background shadow-lg">
                <img src={nssChristmas} alt="Christmas celebration" className="w-full h-full object-cover" />
              </div>
              {/* Small circular image */}
              <div className="absolute top-20 left-0 w-40 h-40 rounded-full overflow-hidden border-4 border-background shadow-lg">
                <img src={nss7daysCamp} alt="NSS camp" className="w-full h-full object-cover" />
              </div>
              {/* Tiny circular image */}
              <div className="absolute bottom-0 left-16 w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg">
                <img src={nssDiwali} alt="Diwali celebration" className="w-full h-full object-cover" />
              </div>
              {/* Decorative dots */}
              <div className="absolute top-4 left-32 w-3 h-3 rounded-full bg-accent" />
              <div className="absolute bottom-24 right-0 w-4 h-4 rounded-full bg-primary/40" />
              <div className="absolute top-40 right-16 w-2 h-2 rounded-full bg-accent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
