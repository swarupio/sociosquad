import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MapPin, Clock, Users, ArrowRight, List, Map } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const opportunities = [
  { id: 1, title: "Community Garden Cleanup", org: "Green Earth Initiative", location: "Ghatkopar West, Mumbai", type: "On-Site", category: "Environment", urgency: "High", spots: 15, hours: "Oct 15, 9:00 AM", match: 94 },
  { id: 2, title: "Blood Donation Camp", org: "Helping Hands", location: "DBIT Mumbai", type: "On-Site", category: "Healthcare", urgency: "High", spots: 20, hours: "Oct 18, 2:00 PM", match: 91 },
  { id: 3, title: "Beach Cleanup Drive", org: "Ocean Warriors", location: "Versova Beach", type: "On-Site", category: "Environment", urgency: "Medium", spots: 30, hours: "Oct 22, 7:00 AM", match: 87 },
  { id: 4, title: "Youth Mentorship Program", org: "Future Leaders", location: "Virtual", type: "Remote", category: "Education", urgency: "Low", spots: 20, hours: "4h/week", match: 82 },
  { id: 5, title: "Senior Care Companionship", org: "Care Connect", location: "Andheri East, Mumbai", type: "On-Site", category: "Healthcare", urgency: "Medium", spots: 10, hours: "Weekends", match: 78 },
  { id: 6, title: "Animal Shelter Support", org: "Paws & Hearts", location: "Parel, Mumbai", type: "On-Site", category: "Humanitarian", urgency: "Low", spots: 15, hours: "Flexible", match: 85 },
];

const categories = ["All", "Environment", "Technology", "Education", "Healthcare", "Humanitarian"];
const types = ["All", "Remote", "On-Site", "Hybrid"];

const Opportunities = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = opportunities.filter((o) => {
    const matchesSearch = o.title.toLowerCase().includes(search.toLowerCase()) || o.org.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "All" || o.category === category;
    const matchesType = type === "All" || o.type === type;
    return matchesSearch && matchesCat && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Explore <span className="gradient-text">Opportunities</span>
                </h1>
                <p className="text-muted-foreground">{filtered.length} opportunities available</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Map className="w-5 h-5" />
                </button>
                <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Search & Filters */}
          <ScrollReveal>
            <div className="glass-card p-4 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search opportunities..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan/30 transition-shadow text-sm"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? "bg-cyan text-cyan-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <p className="text-muted-foreground text-lg">No opportunities match your filters.</p>
              <button onClick={() => { setSearch(""); setCategory("All"); setType("All"); }} className="text-cyan text-sm mt-2 hover:underline">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filtered.map((opp, i) => (
                <ScrollReveal key={opp.id} delay={i * 0.08}>
                  <motion.div whileHover={{ y: -3 }} className="glass-card-hover p-6 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${opp.urgency === "High" ? "bg-destructive/20 text-destructive" : opp.urgency === "Medium" ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                        {opp.urgency} Priority
                      </span>
                      <span className="text-sm font-bold gradient-text">{opp.match}% match</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{opp.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{opp.org}</p>
                    <div className="space-y-2 mb-5 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> {opp.location}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> {opp.hours}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {opp.spots} spots left
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{opp.category}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{opp.type}</span>
                    </div>
                    <Link
                      to={`/opportunities/${opp.id}`}
                      className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 group"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Opportunities;
