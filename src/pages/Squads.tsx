import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Hash, ArrowRight, Trophy, Target, Copy, LogOut, Crown, Swords, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useSquads, useSquadDetail } from "@/hooks/useSquads";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Link, Navigate, useParams } from "react-router-dom";

const EMOJIS = ["🌍", "🔥", "💚", "⚡", "🌊", "🌱", "🦁", "🚀"];

function CreateSquadModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (n: string, d: string, e: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("🌍");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card border border-border rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-display font-bold text-foreground mb-6">Create a Squad</h3>
        
        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Squad Icon</label>
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary hover:bg-muted"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Input
          placeholder="Squad name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 rounded-xl"
        />
        <Textarea
          placeholder="What's your squad about?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="mb-6 rounded-xl resize-none"
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button
            onClick={() => { if (name.trim()) { onCreate(name, desc, emoji); onClose(); setName(""); setDesc(""); } }}
            className="flex-1 rounded-xl"
            disabled={!name.trim()}
          >
            Create <Plus className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateChallengeModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (t: string, d: string, v: number, u: string) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("hours");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card border border-border rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-display font-bold text-foreground mb-6">New Challenge</h3>
        <Input placeholder="Challenge title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-3 rounded-xl" />
        <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} className="mb-3 rounded-xl resize-none" rows={2} />
        <div className="flex gap-3 mb-6">
          <Input type="number" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-xl flex-1" />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-xl border border-input bg-background px-3 text-sm">
            <option value="hours">Hours</option>
            <option value="tasks">Tasks</option>
            <option value="trees">Trees</option>
            <option value="meals">Meals</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button
            onClick={() => { if (title.trim()) { onCreate(title, desc, parseInt(target) || 100, unit); onClose(); setTitle(""); setDesc(""); } }}
            className="flex-1 rounded-xl"
            disabled={!title.trim()}
          >
            Launch Challenge <Swords className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function SquadCard({ squad, onLeave }: { squad: any; onLeave: (id: string) => void }) {
  const { toast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{squad.avatar_emoji}</span>
          <div>
            <h3 className="font-display font-bold text-foreground text-lg">{squad.name}</h3>
            <p className="text-xs text-muted-foreground">{squad.member_count} member{squad.member_count !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {squad.is_member && (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">Joined</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{squad.description || "No description yet"}</p>

      <div className="flex items-center gap-2">
        {squad.is_member ? (
          <>
            <Link to={`/squads/${squad.id}`} className="flex-1">
              <Button size="sm" className="w-full rounded-xl text-xs">
                View Squad <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-xs text-muted-foreground"
              onClick={() => {
                navigator.clipboard.writeText(squad.invite_code);
                toast({ title: "Invite code copied!" });
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="w-full rounded-xl text-xs" disabled>
            Use invite code to join
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function SquadDetailView({ squadId, onDelete, onBack }: { squadId: string; onDelete: (id: string) => void; onBack: () => void }) {
  const { squad, members, challenges, contributions, loading, createChallenge } = useSquadDetail(squadId);
  const [showChallenge, setShowChallenge] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading squad...</div>;
  if (!squad) return <div className="text-center py-20 text-muted-foreground">Squad not found</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-card border border-border rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{squad.avatar_emoji}</span>
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">{squad.name}</h2>
            <p className="text-muted-foreground">{squad.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => { navigator.clipboard.writeText(squad.invite_code); toast({ title: "Invite code copied!" }); }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-mono hover:bg-muted transition-colors"
          >
            <Hash className="w-4 h-4 text-primary" />
            {squad.invite_code}
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          {user?.id === squad.created_by && (
            confirmDelete ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-destructive font-medium">Delete this squad?</span>
                <Button size="sm" variant="destructive" className="rounded-xl text-xs" onClick={() => { onDelete(squad.id); onBack(); }}>
                  Yes, delete
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive rounded-xl" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Members */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Members
          </h3>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {m.profile?.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.profile?.full_name || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
                {m.role === "leader" && <Crown className="w-4 h-4 text-accent" />}
              </div>
            ))}
          </div>
        </div>

        {/* Challenges */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Challenges
            </h3>
            <Button size="sm" onClick={() => setShowChallenge(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> New Challenge
            </Button>
          </div>

          {challenges.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Swords className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No challenges yet. Create the first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map((c) => {
                const pct = Math.min((c.live_progress / c.target_value) * 100, 100);
                const memberContribs = contributions[c.id] || [];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-display font-bold text-foreground">{c.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-secondary text-muted-foreground">Auto-tracked</span>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${c.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{c.live_progress} {c.unit}</span>
                        <span>{c.target_value} {c.unit}</span>
                      </div>
                      <Progress value={pct} className="h-2.5 rounded-full" />
                    </div>

                    {/* Per-member contribution breakdown */}
                    {memberContribs.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Member Contributions</p>
                        <div className="space-y-1.5">
                          {memberContribs
                            .sort((a, b) => b.contribution - a.contribution)
                            .map((mc) => (
                            <div key={mc.user_id} className="flex items-center gap-2 text-xs">
                              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                {mc.profile?.full_name?.[0]?.toUpperCase() || "U"}
                              </div>
                              <span className="text-foreground flex-1 truncate">{mc.profile?.full_name || "Anonymous"}</span>
                              <span className="font-mono text-muted-foreground">{mc.contribution} {c.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateChallengeModal open={showChallenge} onClose={() => setShowChallenge(false)} onCreate={createChallenge} />
    </div>
  );
}

export default function Squads() {
  const { id: routeSquadId } = useParams();
  const { user, isReady } = useAuth();
  const { squads, loading, createSquad, joinByCode, leaveSquad, deleteSquad } = useSquads();
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [selectedSquad, setSelectedSquad] = useState<string | null>(routeSquadId || null);

  if (isReady && !user) return <Navigate to="/auth" replace />;

  const mySquads = squads.filter((s) => s.is_member);
  const discoverSquads = squads.filter((s) => !s.is_member);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 pt-24 pb-16 max-w-6xl">
        {selectedSquad ? (
          <>
            <button
              onClick={() => setSelectedSquad(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1"
            >
              ← Back to Squads
            </button>
            <SquadDetailView squadId={selectedSquad} />
          </>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-5xl font-display font-bold text-foreground"
                >
                  Squads
                </motion.h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Team up with fellow changemakers. Create or join a squad, take on challenges together.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-card border border-border rounded-xl overflow-hidden">
                  <Input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="border-0 rounded-none bg-transparent text-sm w-40"
                    onKeyDown={(e) => { if (e.key === "Enter" && inviteCode) { joinByCode(inviteCode); setInviteCode(""); } }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-none px-3"
                    onClick={() => { if (inviteCode) { joinByCode(inviteCode); setInviteCode(""); } }}
                  >
                    Join
                  </Button>
                </div>
                <Button onClick={() => setShowCreate(true)} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1" /> Create Squad
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-muted-foreground">Loading squads...</div>
            ) : (
              <>
                {/* My Squads */}
                {mySquads.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-xl font-display font-bold text-foreground mb-5 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-accent" /> My Squads
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {mySquads.map((s) => (
                        <div key={s.id} onClick={() => setSelectedSquad(s.id)} className="cursor-pointer">
                          <SquadCard squad={s} onLeave={leaveSquad} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Discover */}
                <section>
                  <h2 className="text-xl font-display font-bold text-foreground mb-5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> {mySquads.length > 0 ? "Discover Squads" : "All Squads"}
                  </h2>
                  {squads.length === 0 ? (
                    <div className="bg-card border border-border rounded-3xl p-12 text-center">
                      <Users className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                      <h3 className="text-xl font-display font-bold text-foreground mb-2">No squads yet</h3>
                      <p className="text-muted-foreground mb-6">Be the first to create a squad and invite your friends!</p>
                      <Button onClick={() => setShowCreate(true)} className="rounded-xl">
                        <Plus className="w-4 h-4 mr-1" /> Create First Squad
                      </Button>
                    </div>
                  ) : discoverSquads.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {discoverSquads.map((s) => (
                        <SquadCard key={s.id} squad={s} onLeave={leaveSquad} />
                      ))}
                    </div>
                  ) : mySquads.length > 0 ? (
                    <p className="text-muted-foreground text-center py-8">You've joined all available squads!</p>
                  ) : null}
                </section>
              </>
            )}
          </>
        )}
      </div>
      <Footer />
      <CreateSquadModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={createSquad} />
    </div>
  );
}
