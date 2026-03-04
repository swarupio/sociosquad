import { motion } from "framer-motion";
import { ArrowRight, Globe, Users, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedCounter from "./AnimatedCounter";
import heroVolunteers from "@/assets/hero-volunteers.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-16">
      {/* Navy arch background */}
      <div className="relative bg-navy overflow-hidden" style={{ borderRadius: "0 0 50% 50% / 0 0 80px 80px" }}>
        <div className="container mx-auto px-6 max-w-7xl pt-20 pb-40 md:pb-52 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-warm" />
              <span className="text-sm font-medium text-white/90">AI-Powered Volunteering Platform</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl xl:text-8xl font-extrabold tracking-tight mb-6 leading-[1.1] text-white">
              Make Your{" "}
              <span className="text-warm">Impact</span>{" "}
              Count
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join a global community of changemakers in Mumbai. AI matches your skills to causes that need you most — turning good intentions into real-world results.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/opportunities">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 justify-center px-8 py-4 rounded-full font-semibold bg-warm text-warm-foreground cursor-pointer text-base"
                >
                  Start Volunteering <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Link>
              <Link to="/opportunities">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors cursor-pointer text-base"
                >
                  Explore Causes
                </motion.span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Overlapping volunteer image */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="container mx-auto px-6 max-w-4xl -mt-28 md:-mt-36 relative z-20"
      >
        <div className="relative">
          <img
            src={heroVolunteers}
            alt="Volunteers gathered at a beach cleanup drive in Versova, Mumbai"
            className="w-full rounded-3xl object-cover shadow-2xl"
            style={{ aspectRatio: "16/9" }}
          />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-navy/30 via-transparent to-transparent pointer-events-none" />
        </div>
      </motion.div>

      {/* Impact Stats below image */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="container mx-auto px-6 max-w-3xl mt-12 mb-8"
      >
        <div className="grid grid-cols-3 gap-8">
          {[
            { icon: Users, value: 50000, suffix: "+", label: "Volunteers" },
            { icon: Globe, value: 120, suffix: "+", label: "Countries" },
            { icon: Heart, value: 8500, suffix: "+", label: "Projects" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon className="w-5 h-5 text-teal mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-bold text-navy">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
