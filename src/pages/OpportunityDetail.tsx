import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Users, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { staticOpportunities } from "@/data/staticOpportunities";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  isStaticOpportunityRegistered,
  removeStaticRegistration,
  upsertStaticRegistration,
} from "@/lib/staticRegistrationFallback";

interface OppDisplay {
  title: string;
  org: string;
  location: string;
  category: string;
  spots: number;
  dateLabel: string;
  startTime?: string;
  endTime?: string;
  timeLabel: string;
  tags: string[];
  urgency: string;
  description: string;
}

const OpportunityDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [joined, setJoined] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [opp, setOpp] = useState<OppDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDbOpp, setIsDbOpp] = useState(false);
  const [dbOppId, setDbOppId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }

    // First check static opportunities
    const staticOpp = staticOpportunities.find(o => o.id === id);
    if (staticOpp) {
      setOpp(staticOpp);
      setIsDbOpp(false);
      if (user) {
        isStaticOpportunityRegistered(user.id, staticOpp.id)
          .then(setJoined)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }

    // Then check DB
    const fetchFromDb = async () => {
      setLoadError(null);

      try {
        const { data, error } = await supabase
          .from("opportunities")
          .select("*, organizations(name)")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setOpp(null);
          return;
        }

        setDbOppId(data.id);
        setIsDbOpp(true);
        const timeCommitment = data.time_commitment || "";
        const timeHours = timeCommitment === "Quick Impact" ? 0.5 : timeCommitment === "Half Day" ? 3 : 6;
        setOpp({
          title: data.title,
          org: (data as any).organizations?.name || "Organization",
          location: `${data.location || ""}${data.city ? ", " + data.city : ""}`,
          category: data.category,
          spots: data.max_volunteers || 0,
          dateLabel: data.date ? new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
          startTime: data.start_time || undefined,
          endTime: data.end_time || undefined,
          timeLabel: timeCommitment || `${timeHours} hrs`,
          tags: data.skills_needed || [],
          urgency: (data.max_volunteers || 0) < 10 ? "High" : "Medium",
          description: data.description,
        });

        if (user) {
          const { data: reg, error: registrationError } = await supabase
            .from("volunteer_registrations")
            .select("id")
            .eq("opportunity_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (registrationError) {
            throw registrationError;
          }

          setJoined(!!reg);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load opportunity details");
      } finally {
        setLoading(false);
      }
    };

    fetchFromDb();
  }, [id, user]);

  const handleToggleRegistration = async () => {
    if (!user) {
      toast({ title: "Please sign in to register", variant: "destructive" });
      return;
    }

    const oppId = isDbOpp ? dbOppId : id;
    if (!oppId) return;

    setRegistering(true);
    try {
      if (joined) {
        if (isDbOpp) {
          const { error } = await supabase
            .from("volunteer_registrations")
            .delete()
            .eq("opportunity_id", oppId)
            .eq("user_id", user.id);

          if (error) {
            throw error;
          }
        } else {
          await removeStaticRegistration(user.id, oppId);
        }
        setJoined(false);
        toast({ title: "Registration cancelled" });
      } else {
        if (isDbOpp) {
          const { error } = await supabase
            .from("volunteer_registrations")
            .insert({ opportunity_id: oppId, user_id: user.id });

          if (error) {
            throw error;
          }
        } else {
          await upsertStaticRegistration(user.id, oppId);
        }
        setJoined(true);
        toast({ title: "Registered successfully! 🎉" });
      }
      // Invalidate registrations query so Dashboard/Profile update
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    } catch (err) {
      toast({
        title: "Unable to update registration",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <div className="glass-card p-16">
              <p className="text-xl text-muted-foreground mb-4">{loadError ? "Could not load opportunity" : "Opportunity not found"}</p>
              {loadError && <p className="text-sm text-muted-foreground mb-4">{loadError}</p>}
              <Link to="/opportunities" className="text-primary hover:underline">← Back to Opportunities</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <ScrollReveal>
            <Link to="/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Opportunities
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="glass-card p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{opp.category}</span>
                <span className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground font-medium">{opp.timeLabel}</span>
                {opp.urgency === "High" && (
                  <span className="text-xs px-3 py-1 rounded-full bg-destructive/20 text-destructive font-medium">Filling Fast</span>
                )}
                {joined && (
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Registered
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{opp.title}</h1>
              <p className="text-lg text-muted-foreground mb-8">{opp.org}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">{opp.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium text-foreground">{opp.dateLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <Users className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Spots Available</p>
                    <p className="text-sm font-medium text-foreground">{opp.spots} spots</p>
                  </div>
                </div>
              </div>

              {opp.startTime && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 mb-8">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium text-foreground">{opp.startTime} – {opp.endTime}</p>
                  </div>
                </div>
              )}

              {opp.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-8">
                  {opp.tags.map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3">About this opportunity</h2>
                <p className="text-muted-foreground leading-relaxed">{opp.description}</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleToggleRegistration}
                disabled={registering}
                className={`w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  joined
                    ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive"
                    : "bg-primary text-primary-foreground hover:brightness-105"
                }`}
              >
                {registering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : joined ? (
                  <><CheckCircle2 className="w-5 h-5" /> Registered — Click to Cancel</>
                ) : (
                  "Join This Opportunity"
                )}
              </motion.button>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OpportunityDetail;
