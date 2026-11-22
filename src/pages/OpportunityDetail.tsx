import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Users, Calendar, CalendarPlus, CheckCircle2, Loader2, Share2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { staticOpportunities } from "@/data/staticOpportunities";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { downloadIcs } from "@/lib/calendar";
import { db, isMissingMigration } from "@/lib/db";
import { useMyOrganization } from "@/hooks/useOrganization";
import { usePageMeta } from "@/hooks/usePageMeta";
import JsonLd from "@/components/seo/JsonLd";
import { volunteerOpportunityJsonLd, type OpportunityLike } from "@/lib/structuredData";
import AnnouncementFeed from "@/components/announcements/AnnouncementFeed";
import AnnouncementComposer from "@/components/announcements/AnnouncementComposer";
import ReviewList from "@/components/feedback/ReviewList";
import FeedbackForm from "@/components/feedback/FeedbackForm";
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
  /** ISO date (YYYY-MM-DD) when known; enables add-to-calendar. */
  date?: string;
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
  const [dbInfo, setDbInfo] = useState<{ orgId: string; attended: boolean; ld: OpportunityLike } | null>(null);
  const { org: myOrg } = useMyOrganization();

  const userId = user?.id ?? null;

  usePageMeta({
    title: opp?.title ?? "Volunteering opportunity",
    description: opp ? `${opp.title} with ${opp.org}. ${opp.description}` : "Volunteer with verified NGOs on SocioSquad.",
    path: id ? `/opportunities/${id}` : undefined,
  });

  useEffect(() => {
    let cancelled = false;

    // Reset state whenever the id (or user) changes
    setOpp(null);
    setJoined(false);
    setLoadError(null);
    setIsDbOpp(false);
    setDbOppId(null);

    if (!id) { setLoading(false); return; }
    setLoading(true);

    // First check static opportunities
    const staticOpp = staticOpportunities.find(o => o.id === id);
    if (staticOpp) {
      setOpp(staticOpp);
      setIsDbOpp(false);
      if (userId) {
        isStaticOpportunityRegistered(userId, staticOpp.id)
          .then((v) => { if (!cancelled) setJoined(v); })
          .catch((err) => {
            if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load registration status");
          })
          .finally(() => { if (!cancelled) setLoading(false); });
      } else {
        setLoading(false);
      }
      return () => { cancelled = true; };
    }

    // Then check DB
    const fetchFromDb = async () => {
      try {
        const [{ data: row, error }, regResult] = await Promise.all([
          supabase
            .from("opportunities")
            .select("id, org_id, title, description, category, skills_needed, date, start_time, end_time, location, city, max_volunteers, time_commitment, organizations(name)")
            .eq("id", id)
            .maybeSingle(),
          userId
            ? supabase
                .from("volunteer_registrations")
                .select("id, attended")
                .eq("opportunity_id", id)
                .eq("user_id", userId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (cancelled) return;
        if (error) {
          throw error;
        }
        if (regResult.error) {
          throw regResult.error;
        }

        if (!row) {
          setOpp(null);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = row as any;
        const timeCommitment: string = data.time_commitment || "";
        const timeHours = timeCommitment === "Quick Impact" ? 0.5 : timeCommitment === "Half Day" ? 3 : 6;
        const locationLabel = [data.location, data.city]
          .map((v: string | null | undefined) => v?.trim())
          .filter(Boolean)
          .join(", ");
        const maxVolunteers: number = data.max_volunteers ?? 0;

        const isJoined = !!regResult.data;

        setDbOppId(data.id);
        setIsDbOpp(true);
        setOpp({
          title: data.title ?? "Untitled opportunity",
          org: data.organizations?.name || "Organization",
          location: locationLabel || "Location not specified",
          category: data.category ?? "General",
          spots: maxVolunteers,
          date: data.date || undefined,
          dateLabel: data.date ? new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date TBD",
          startTime: data.start_time || undefined,
          endTime: data.end_time || undefined,
          timeLabel: timeCommitment || `${timeHours} hrs`,
          tags: Array.isArray(data.skills_needed) ? data.skills_needed : [],
          urgency: maxVolunteers < 10 ? "High" : "Medium",
          description: data.description ?? "",
        });
        setJoined(isJoined);
        setDbInfo({
          orgId: data.org_id,
          attended: regResult.data?.attended === true,
          ld: {
            id: data.id,
            title: data.title ?? "Untitled opportunity",
            description: data.description,
            date: data.date,
            start_time: data.start_time,
            end_time: data.end_time,
            location: data.location,
            city: data.city,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            organization_name: data.organizations?.name,
            organization_id: data.org_id,
          },
        });
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load opportunity details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFromDb();
    return () => { cancelled = true; };
  }, [id, userId]);

  const handleAddToCalendar = () => {
    if (!opp?.date) return;
    try {
      downloadIcs({
        id: id ?? opp.title,
        title: opp.title,
        date: opp.date,
        startTime: opp.startTime,
        endTime: opp.endTime,
        location: opp.location,
        description: opp.description,
        organizer: opp.org,
        url: window.location.href,
      });
    } catch {
      toast({ title: "Couldn't create calendar file", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!opp) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: opp.title, text: `Volunteer with ${opp.org}: ${opp.title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    } catch (err) {
      // The user dismissing the native share sheet is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast({ title: "Couldn't share this opportunity", variant: "destructive" });
    }
  };

  const handleToggleRegistration = async () => {
    if (!user) {
      toast({ title: "Please sign in to register", variant: "destructive" });
      return;
    }

    const oppId = isDbOpp ? dbOppId : id;
    if (!oppId || registering) return;

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
          // Capacity-aware RPC (enforces max volunteers, supports a waitlist); falls back
          // to a plain insert until the migration is applied.
          const rpc = await db.rpc<{ status?: string; position?: number | null }>("register_for_opportunity", {
            p_opportunity_id: oppId,
          });
          if (rpc.error && !isMissingMigration(rpc.error)) throw new Error(rpc.error.message);
          if (rpc.error) {
            const { error } = await supabase
              .from("volunteer_registrations")
              .insert({ opportunity_id: oppId, user_id: user.id });
            if (error) throw error;
          } else if (rpc.data?.status === "waitlisted") {
            toast({
              title: "You're on the waitlist",
              description: "We'll register you automatically if a spot opens.",
            });
            queryClient.invalidateQueries({ queryKey: ["waitlist"] });
            return;
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
                    <p className="text-sm font-medium text-foreground">{opp.startTime}{opp.endTime ? ` – ${opp.endTime}` : ""}</p>
                  </div>
                </div>
              )}

              {(opp.tags ?? []).length > 0 && (
                <div className="flex gap-2 flex-wrap mb-8">
                  {(opp.tags ?? []).map(tag => (
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
                aria-busy={registering}
                aria-label={registering ? "Updating registration" : joined ? "Registered. Click to cancel registration" : "Join this opportunity"}
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

              <div className="mt-3 flex gap-3">
                {opp.date && (
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="flex-1 py-3 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-secondary flex items-center justify-center gap-2 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Add to calendar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 py-3 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-secondary flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" /> Share
                </button>
              </div>

              {dbInfo && isDbOpp && (
                <div className="mt-10 space-y-8">
                  <section aria-labelledby="updates-heading">
                    <h2 id="updates-heading" className="text-lg font-bold text-foreground mb-3">Updates from the organiser</h2>
                    {myOrg?.id === dbInfo.orgId && (
                      <div className="mb-4">
                        <AnnouncementComposer opportunityId={dbInfo.ld.id} orgId={dbInfo.orgId} />
                      </div>
                    )}
                    {(joined || myOrg?.id === dbInfo.orgId) && (
                      <AnnouncementFeed opportunityId={dbInfo.ld.id} canManage={myOrg?.id === dbInfo.orgId} />
                    )}
                    {!joined && myOrg?.id !== dbInfo.orgId && (
                      <p className="text-sm text-muted-foreground">Register to see updates from the organiser.</p>
                    )}
                  </section>
                  <section aria-labelledby="reviews-heading">
                    <h2 id="reviews-heading" className="text-lg font-bold text-foreground mb-3">Reviews</h2>
                    {dbInfo.attended && (
                      <div className="mb-4">
                        <FeedbackForm opportunityId={dbInfo.ld.id} />
                      </div>
                    )}
                    <ReviewList opportunityId={dbInfo.ld.id} />
                  </section>
                  <JsonLd data={volunteerOpportunityJsonLd(dbInfo.ld, window.location.origin)} />
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OpportunityDetail;
