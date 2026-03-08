import { motion } from "framer-motion";
import { ArrowRight, Menu, X, User as UserIcon, LogOut, LayoutDashboard, Award, Users, Building2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { label: "Explore", to: "/opportunities" },
  { label: "Schedule", to: "/schedule" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Community", to: "/community" },
  { label: "Squads", to: "/squads" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isReady, signOut } = useAuth();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const displayName = user?.user_metadata?.full_name || user?.email || "User";

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
        <Link to="/" className="text-xl font-display font-bold text-primary">SocioSquad</Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`text-sm font-body transition-colors ${location.pathname === item.to ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isReady && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{displayName}</span>
              </button>

              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-muted-foreground" /> Profile
                    </Link>
                    <Link
                      to="/portfolio"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Award className="w-4 h-4 text-muted-foreground" /> Impact Portfolio
                    </Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-secondary transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : isReady ? (
            <>
              <Link to="/auth" className="px-4 py-2 text-sm font-medium font-body text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link to="/auth">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-full text-sm font-semibold font-body bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  Sign Up <ArrowRight className="w-3.5 h-3.5" />
                </motion.span>
              </Link>
            </>
          ) : null}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-card border-b border-border p-6 space-y-4"
        >
          {navLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`block font-body transition-colors ${location.pathname === item.to ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
          {isReady && user ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)} className="block text-foreground font-body font-semibold">
                My Profile
              </Link>
              <button
                onClick={() => { setOpen(false); handleSignOut(); }}
                className="block w-full py-3 rounded-full text-sm font-semibold font-body bg-destructive text-destructive-foreground text-center mt-4"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setOpen(false)} className="block text-muted-foreground hover:text-foreground transition-colors font-body">
                Sign In
              </Link>
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block w-full py-3 rounded-full text-sm font-semibold font-body bg-primary text-primary-foreground text-center mt-4"
              >
                Sign Up
              </Link>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
