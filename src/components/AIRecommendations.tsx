import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shuffle, MapPin, Clock, Timer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import ScrollReveal from "./ScrollReveal";

interface UpcomingOpp {
  id: string;
  title: string;
  category: string;
  date: string;
  start_time: string | null;
  location: string;
  time_commitment: string | null;
}

const fetchUpcoming = async (): Promise<UpcomingOpp[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, title, category, date, start_time, location, time_commitment")
    .eq("status", "open")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(3);
  if (error) throw error;
  return (data ?? []) as UpcomingOpp[];
};

const formatDate = (iso: string, time: string | null) => {
  const d = new Date(`${iso}T00:00:00`);
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return time ? `${label}, ${time.slice(0, 5)}` : label;
};

const AIRecommendations = () => {
  const navigate = useNavigate();
  const [isSpinning, setIsSpinning] = useState(false);
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["home-upcoming-opportunities"],
    queryFn: fetchUpcoming,
    staleTime: 5 * 60 * 1000,
  });

  const handleSurpriseMe = () => {
    setIsSpinning(true);
    setTimeout(() => {
      setIsSpinning(false);
      if (recommendations.length > 0) {
        const random = recommendations[Math.floor(Math.random() * recommendations.length)];
        navigate(`/opportunities/${random.id}`);
      } else {
        navigate("/opportunities");
      }
    }, 800);
  };

  return (
    <section className="py-24 relative bg-secondary">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-sm font-semibold font-body text-primary uppercase tracking-wider">Campaigns</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mt-2 text-foreground">
                Discover Our Campaigns
              </h2>
              <p className="text-muted-foreground max-w-xl mt-3 font-body">
                Join us in doing something great for our community.
              </p>
            </div>
            <Link to="/opportunities" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold font-body text-primary hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>

        {!isLoading && recommendations.length === 0 && (
          <p className="text-center text-muted-foreground font-body mb-8">
            No upcoming opportunities right now.{" "}
            <Link to="/opportunities" className="text-primary font-semibold hover:underline">Browse all opportunities</Link>
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recommendations.map((rec, i) => (
            <ScrollReveal key={rec.id} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-card border border-border rounded-3xl p-6 h-full flex flex-col hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs px-3 py-1 rounded-full font-semibold font-body bg-secondary text-foreground">
                    {rec.category}
                  </span>
                  {rec.time_commitment && (
                    <span className="text-xs text-muted-foreground font-medium font-body flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5" /> {rec.time_commitment}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-lg text-foreground mb-4">{rec.title}</h3>

                <div className="space-y-2 mb-5 flex-1">
                  {rec.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {rec.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <Clock className="w-3.5 h-3.5 shrink-0" /> {formatDate(rec.date, rec.start_time)}
                  </div>
                </div>

                <Link to={`/opportunities/${rec.id}`} className="w-full py-3 rounded-full text-sm font-semibold font-body bg-primary text-primary-foreground flex items-center justify-center gap-2 group">
                  View Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="text-center">
            <motion.button
              onClick={handleSurpriseMe}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              animate={isSpinning ? { rotate: 360 } : {}}
              transition={{ duration: 0.6 }}
              className="px-8 py-4 rounded-full font-semibold font-body border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-2"
            >
              <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              {isSpinning ? "Finding your match..." : "Surprise Me — Find a Random Match"}
            </motion.button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AIRecommendations;
