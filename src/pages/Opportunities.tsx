import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MapPin, Clock, Users, ArrowRight, List, Map, Timer, Building2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { usePublicOpportunities } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Legacy hardcoded data as fallback
const hardcodedOpps = [
  { id: "h1", title: "Versova Beach Cleanup", org: "Clean Coast Mumbai", location: "Versova Beach, Andheri West, Mumbai", category: "Environment", spots: 30, date: "Mar 15, 2026", timeLabel: "2 hrs", timeHours: 2, tags: ["Environment", "Outdoor"], urgency: "High" },
  { id: "h2", title: "Tech Literacy for Kids", org: "Future India Foundation", location: "Indiranagar, Bangalore", category: "Education", spots: 15, date: "Mar 20, 2026", timeLabel: "1 hr", timeHours: 1, tags: ["Education", "Tech"], urgency: "Medium" },
  { id: "h3", title: "Stray Animal Feeding Drive", org: "Paws of Delhi", location: "Hauz Khas Village, New Delhi", category: "Humanitarian", spots: 20, date: "Mar 27, 2026", timeLabel: "3 hrs", timeHours: 3, tags: ["Animals", "Community"], urgency: "High" },
  { id: "h4", title: "Urban Tree Plantation", org: "Green Yatra", location: "Viman Nagar, Pune", category: "Environment", spots: 25, date: "Apr 5, 2026", timeLabel: "4 hrs", timeHours: 4, tags: ["Environment", "Climate"], urgency: "Medium" },
  { id: "h5", title: "Food Distribution for Seniors", org: "Robin Hood Army", location: "Salt Lake City, Kolkata", category: "Healthcare", spots: 12, date: "Apr 12, 2026", timeLabel: "2 hrs", timeHours: 2, tags: ["Community", "Food"], urgency: "High" },
];

const categories = ["All", "Environment", "Education", "Healthcare", "General", "Community", "Health"];
const timeFilters = [
  { label: "All", min: 0, max: Infinity },
  { label: "Quick Impact (< 1 hr)", min: 0, max: 1 },
  { label: "Half Day (1-4 hrs)", min: 1, max: 4 },
  { label: "Full Day (4+ hrs)", min: 4, max: Infinity },
];

const Opportunities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { opportunities: dbOpps, loading, register, unregister } = usePublicOpportunities();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Convert DB opportunities to display format
  const realOpps = dbOpps.map(o => ({
    id: o.id,
    title: o.title,
    org: o.organization?.name || "Organization",
    location: `${o.location}, ${o.city}`,
    category: o.category,
    spots: o.max_volunteers - (o.registration_count || 0),
    date: o.date,
    timeLabel: o.time_commitment,
    timeHours: o.time_commitment === "Quick Impact" ? 0.5 : o.time_commitment === "Half Day" ? 3 : o.time_commitment === "Full Day" ? 6 : 4,
    tags: o.skills_needed || [],
    urgency: o.max_volunteers - (o.registration_count || 0) < 5 ? "High" : "Medium",
    isReal: true,
    is_registered: o.is_registered,
    registration_count: o.registration_count,
    max_volunteers: o.max_volunteers,
    description: o.description,
    start_time: o.start_time,
    end_time: o.end_time,
  }));

  // Merge: real opps first, then hardcoded
  const allOpps = [...realOpps, ...hardcodedOpps.map(o => ({ ...o, isReal: false, is_registered: false, registration_count: 0, max_volunteers: o.spots, description: "", start_time: "", end_time: "" }))];

  const filtered = allOpps.filter((o) => {
    const matchesSearch = o.title.toLowerCase().includes(search.toLowerCase()) || o.org.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "All" || o.category === category;
    const activeTimeFilter = timeFilters.find(f => f.label === timeFilter)!;
    const matchesTime = timeFilter === "All" || (o.timeHours >= activeTimeFilter.min && o.timeHours <= activeTimeFilter.max);
    return matchesSearch && matchesCat && matchesTime;
  });

  const handleRegister = async (oppId: string, isRegistered: boolean) => {
    if (!user) {
      toast({ title: "Sign in to register", variant: "destructive" });
      return;
    }
    if (isRegistered) {
      await unregister(oppId);
      toast({ title: "Registration cancelled" });
    } else {
      await register(oppId);
      toast({ title: "Registered! 🎉" });
    }
  };

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
              <div className="flex items-center gap-3">
                <Link to="/ngo/register">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">
                    <Building2 className="w-3.5 h-3.5 mr-1" /> Post as NGO
                  </Button>
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <Map className="w-5 h-5" />
                  </button>
                  <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <List className="w-5 h-5" />
                  </button>
                </div>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow text-sm"
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
              <div className="flex gap-2 mt-3 flex-wrap">
                <Timer className="w-4 h-4 text-muted-foreground self-center" />
                {timeFilters.map((tf) => (
                  <button
                    key={tf.label}
                    onClick={() => setTimeFilter(tf.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${timeFilter === tf.label ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <p className="text-muted-foreground text-lg">No opportunities match your filters.</p>
              <button onClick={() => { setSearch(""); setCategory("All"); setTimeFilter("All"); }} className="text-primary text-sm mt-2 hover:underline">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filtered.map((opp, i) => (
                <ScrollReveal key={opp.id} delay={i * 0.06}>
                  <motion.div whileHover={{ y: -3 }} className="glass-card-hover p-6 h-full flex flex-col relative">
                    {(opp as any).isReal && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold rounded-full bg-primary/10 text-primary">VERIFIED NGO</span>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${opp.urgency === "High" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-600"}`}>
                        {opp.urgency === "High" ? "Filling Fast" : opp.category}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground font-medium flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {opp.timeLabel}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{opp.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{opp.org}</p>
                    <div className="space-y-2 mb-5 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {opp.location}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" /> {opp.date}{opp.start_time ? ` • ${opp.start_time}–${opp.end_time}` : ""}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5 shrink-0" /> {opp.spots > 0 ? `${opp.spots} spots left` : "Full"}
                      </div>
                    </div>
                    {opp.tags && opp.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-4">
                        {opp.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}

                    {(opp as any).isReal ? (
                      <Button
                        onClick={() => handleRegister(opp.id, !!(opp as any).is_registered)}
                        variant={(opp as any).is_registered ? "outline" : "default"}
                        className="w-full rounded-xl text-sm"
                      >
                        {(opp as any).is_registered ? (
                          <><CheckCircle className="w-4 h-4 mr-1" /> Registered</>
                        ) : (
                          <>Register <ArrowRight className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    ) : (
                      <Link
                        to={`/opportunities/${opp.id}`}
                        className="mt-auto w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-2 group"
                      >
                        View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}
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
