import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = [
  {
    title: "Menu",
    links: [
      { label: "Explore", to: "/opportunities" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Leaderboard", to: "/leaderboard" },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Environment", to: "/opportunities" },
      { label: "Education", to: "/opportunities" },
      { label: "Healthcare", to: "/opportunities" },
    ],
  },
  {
    title: "About Us",
    links: [
      { label: "Community", to: "/community" },
      { label: "Profile", to: "/profile" },
      { label: "Privacy", to: "/" },
    ],
  },
];

const Footer = () => (
  <footer className="py-16 bg-primary text-primary-foreground">
    <div className="container mx-auto px-6 max-w-7xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div>
          <Link to="/" className="font-display font-bold text-xl">SocioSquad</Link>
          <p className="text-sm leading-relaxed mt-4 font-body opacity-70">
            Community-driven volunteering platform connecting skills to causes that matter most.
          </p>
        </div>
        {footerLinks.map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold font-body mb-4">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm font-body opacity-70 hover:opacity-100 transition-opacity">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-primary-foreground/20">
        <p className="text-sm font-body opacity-50">© 2026 SocioSquad. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
