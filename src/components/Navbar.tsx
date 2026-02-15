import { motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="text-xl font-bold gradient-text">ImpactFlow</a>

        <div className="hidden md:flex items-center gap-8">
          {["Explore", "Dashboard", "Leaderboard", "Community"].map((item) => (
            <a key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-primary-foreground flex items-center gap-1.5"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border p-6 space-y-4"
        >
          {["Explore", "Dashboard", "Leaderboard", "Community"].map((item) => (
            <a key={item} href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
              {item}
            </a>
          ))}
          <button
            className="w-full py-3 rounded-xl text-sm font-semibold text-primary-foreground mt-4"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get Started
          </button>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
