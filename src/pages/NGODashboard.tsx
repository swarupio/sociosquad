import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Users, Calendar, MapPin, Clock, Trash2, CheckCircle, XCircle, Eye, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganization, useOrgOpportunities, useOpportunityVolunteers } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Navigate, Link } from "react-router-dom";

const CATEGORIES = ["Environment", "Education", "Health", "Community", "Animals", "Disaster Relief", "Elderly Care", "General"];
const SKILLS = ["Teaching", "Medical", "Driving", "Cooking", "Photography", "Counseling", "Tech", "Manual Labor", "Leadership", "Languages"];

function PostOpportunityModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (d: any) => void }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "General", location: "", city: "Mumbai",
    date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "17:00",
    max_volunteers: 50, time_commitment: "Half Day", skills_needed: [] as string[],
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleSkill = (s: string) => set("skills_needed", form.skills_needed.includes(s) ? form.skills_needed.filter(x => x !== s) : [...form.skills_needed, s]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-3xl p-8 w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-display font-bold text-foreground mb-6">Post Opportunity</h3>

        <Input placeholder="Opportunity title" value={form.title} onChange={e => set("title", e.target.value)} className="mb-3 rounded-xl" />
        <Textarea placeholder="Describe the volunteering activity..." value={form.description} onChange={e => set("description", e.target.value)} className="mb-3 rounded-xl resize-none" rows={3} />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <select value={form.category} onChange={e => set("category", e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={form.time_commitment} onChange={e => set("time_commitment", e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option>Quick Impact</option>
            <option>Half Day</option>
            <option>Full Day</option>
            <option>Recurring</option>
          </select>
        </div>

        <Input placeholder="Location" value={form.location} onChange={e => set("location", e.target.value)} className="mb-3 rounded-xl" />

        <div className="grid grid-cols-3 gap-3 mb-3">
          <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="rounded-xl" />
          <Input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} className="rounded-xl" />
          <Input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} className="rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Volunteers</label>
            <Input type="number" value={form.max_volunteers} onChange={e => set("max_volunteers", parseInt(e.target.value) || 50)} className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City</label>
            <select value={form.city} onChange={e => set("city", e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm h-10">
              <option>Mumbai</option><option>Delhi</option><option>Bangalore</option><option>Pune</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs text-muted-foreground mb-2 block">Skills Needed</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(s => (
              <button key={s} onClick={() => toggleSkill(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${form.skills_needed.includes(s) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={() => { if (form.title.trim() && form.location.trim()) { onCreate(form); onClose(); } }} className="flex-1 rounded-xl" disabled={!form.title.trim()}>
            Post <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function VolunteerManager({ opportunityId, opportunityTitle, startTime, endTime }: { opportunityId: string; opportunityTitle: string; startTime?: string; endTime?: string }) {
  const { user } = useAuth();
  const { volunteers, loading, verifyAttendance } = useOpportunityVolunteers(opportunityId);

  // Calculate hours from opportunity times
  const calcHours = () => {
    if (!startTime || !endTime) return 1;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    return Math.max(Math.round(diff * 10) / 10, 0.5);
  };
  const hours = calcHours();

  if (loading) return <p className="text-sm text-muted-foreground">Loading volunteers...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-display font-bold text-foreground">{volunteers.length} Volunteer{volunteers.length !== 1 ? "s" : ""} Registered</h4>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{hours}h per volunteer</span>
      </div>
      {volunteers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No volunteers registered yet.</p>
      ) : (
        <div className="space-y-2">
          {volunteers.map(v => (
            <div key={v.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {v.profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{v.profile?.full_name || "Anonymous"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {v.status === "verified" ? "✅ Verified" : v.status === "absent" ? "❌ Absent" : "Pending verification"}
                  {v.hours_credited > 0 && ` • ${v.hours_credited}h credited`}
                </p>
              </div>
              {v.status === "registered" && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0 text-primary hover:bg-primary/10" onClick={() => verifyAttendance(v.id, true, hours, user!.id)}>
                    <CheckCircle className="w-5 h-5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => verifyAttendance(v.id, false, 0, user!.id)}>
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NGODashboard() {
  const { user, isReady } = useAuth();
  const { org, loading: orgLoading } = useMyOrganization();
  const { opportunities, loading: oppsLoading, createOpportunity, deleteOpportunity } = useOrgOpportunities(org?.id);
  const [showPost, setShowPost] = useState(false);
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);

  if (isReady && !user) return <Navigate to="/auth" replace />;
  if (!orgLoading && !org) return <Navigate to="/ngo/register" replace />;

  const totalVolunteers = opportunities.reduce((s, o) => s + (o.registration_count || 0), 0);
  const activeOpps = opportunities.filter(o => o.status === "open").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-16 max-w-6xl">
        {orgLoading ? (
          <div className="text-center py-20"><Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Org Header */}
            <div className="bg-card border border-border rounded-3xl p-8 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">{org?.name}</h1>
                  <p className="text-muted-foreground text-sm">{org?.description}</p>
                </div>
              </div>
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{activeOpps}</div>
                  <div className="text-xs text-muted-foreground">Active Listings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{totalVolunteers}</div>
                  <div className="text-xs text-muted-foreground">Volunteers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{opportunities.length}</div>
                  <div className="text-xs text-muted-foreground">Total Posted</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-foreground">Your Opportunities</h2>
              <Button onClick={() => setShowPost(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Post Opportunity
              </Button>
            </div>

            {/* Opportunities List */}
            {oppsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : opportunities.length === 0 ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-display font-bold text-foreground mb-2">No opportunities yet</h3>
                <p className="text-muted-foreground mb-6">Post your first volunteering opportunity to start getting volunteers!</p>
                <Button onClick={() => setShowPost(true)} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1" /> Post First Opportunity
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map(opp => (
                  <motion.div key={opp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-foreground text-lg">{opp.title}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${opp.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {opp.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{opp.description}</p>
                        </div>
                        <div className="flex gap-1.5 ml-4">
                          <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setExpandedOpp(expandedOpp === opp.id ? null : opp.id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => deleteOpportunity(opp.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{opp.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{opp.start_time} - {opp.end_time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{opp.registration_count}/{opp.max_volunteers}</span>
                      </div>

                      {opp.skills_needed && opp.skills_needed.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {opp.skills_needed.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      )}

                      {/* Volunteer fill bar */}
                      <div className="mt-3">
                        <Progress value={((opp.registration_count || 0) / opp.max_volunteers) * 100} className="h-1.5 rounded-full" />
                      </div>
                    </div>

                    {/* Expanded volunteer management */}
                    {expandedOpp === opp.id && (
                      <div className="border-t border-border p-5 bg-secondary/20">
                        <VolunteerManager opportunityId={opp.id} opportunityTitle={opp.title} startTime={opp.start_time} endTime={opp.end_time} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
      <PostOpportunityModal open={showPost} onClose={() => setShowPost(false)} onCreate={createOpportunity} />
    </div>
  );
}
