import { Heart } from "lucide-react";

const Footer = () => (
  <footer className="py-12 border-t border-border/50">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div>
          <h4 className="font-bold text-foreground mb-4 gradient-text text-lg">ImpactFlow</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered volunteering platform connecting skills to causes that matter most.
          </p>
        </div>
        {[
          { title: "Platform", links: ["Explore", "Dashboard", "Map", "Leaderboard"] },
          { title: "Community", links: ["Events", "Blog", "Discord", "Partners"] },
          { title: "Company", links: ["About", "Careers", "Privacy", "Terms"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-foreground mb-4">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          © 2026 ImpactFlow. All rights reserved.
        </p>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2 md:mt-0">
          Made with <Heart className="w-3.5 h-3.5 text-destructive" /> for a better world
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
