import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Explore", to: "/opportunities" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Leaderboard", to: "/leaderboard" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Feed", to: "/community" },
      { label: "Profile", to: "/profile" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
    ],
  },
];

const Footer = () => (
  <footer className="py-12 border-t border-border/50">
    <div className="container mx-auto px-6 max-w-7xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div>
          <Link to="/" className="font-bold gradient-text text-lg">ImpactFlow</Link>
          <p className="text-sm text-muted-foreground leading-relaxed mt-4">
            AI-powered volunteering platform connecting skills to causes that matter most.
          </p>
        </div>
        {footerLinks.map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-foreground mb-4">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border/50">
        <p className="text-sm text-muted-foreground">© 2026 ImpactFlow. All rights reserved.</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2 md:mt-0">
          Made with <Heart className="w-3.5 h-3.5 text-destructive" /> for a better world
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
