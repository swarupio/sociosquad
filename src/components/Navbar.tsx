import { motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { label: "Explore", to: "/opportunities" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Community", to: "/community" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
        <Link to="/" className="text-xl font-bold gradient-text">SocioSquad</Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`text-sm transition-colors ${location.pathname === item.to ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/profile" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Profile
          </Link>
          <Link to="/opportunities">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-primary-foreground flex items-center gap-1.5 cursor-pointer"
              style={{ background: "var(--gradient-primary)" }}
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </motion.span>
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border p-6 space-y-4"
        >
          {navLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`block transition-colors ${location.pathname === item.to ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block text-muted-foreground hover:text-foreground transition-colors"
          >
            Profile
          </Link>
          <Link
            to="/opportunities"
            onClick={() => setOpen(false)}
            className="block w-full py-3 rounded-xl text-sm font-semibold text-primary-foreground text-center mt-4"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get Started
          </Link>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
