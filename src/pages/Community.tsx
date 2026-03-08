import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Heart, Share2, Send, Users, TrendingUp, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Post {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_initials: string;
  created_at: string;
}

const trending = [
  { tag: "#ClimateAction", posts: "1.2k" },
  { tag: "#EducationForAll", posts: "890" },
  { tag: "#YouthMentorship", posts: "654" },
  { tag: "#EmergencyRelief", posts: "432" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const Community = () => {
  const [newPost, setNewPost] = useState("");
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; initials: string } | null>(null);

  // Fetch user session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        setCurrentUser({ id: user.id, name, initials });
      }
    };
    getUser();
  }, []);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setPosts(data);
      setLoading(false);
    };
    fetchPosts();

    // Realtime subscription
    const channel = supabase
      .channel("community_posts_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
        setPosts((prev) => [payload.new as Post, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    if (!currentUser) {
      toast({ title: "Please sign in", description: "You need to be logged in to post.", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: currentUser.id,
      content: newPost.trim(),
      author_name: currentUser.name,
      author_initials: currentUser.initials,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    } else {
      setNewPost("");
    }
    setPosting(false);
  };

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <ScrollReveal>
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                <span className="gradient-text">Community</span> Hub
              </h1>
              <p className="text-muted-foreground">Share your journey, inspire others</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Create Post */}
              <ScrollReveal>
                <div className="glass-card p-6">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder={currentUser ? "Share your impact story..." : "Sign in to share your story..."}
                    disabled={!currentUser}
                    className="w-full bg-secondary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-cyan/30 transition-shadow disabled:opacity-50"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handlePost(); }}
                  />
                  <div className="flex justify-end mt-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePost}
                      disabled={posting || !currentUser || !newPost.trim()}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground flex items-center gap-2 disabled:opacity-50"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Post
                    </motion.button>
                  </div>
                </div>
              </ScrollReveal>

              {/* Loading Skeletons */}
              {loading && (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              )}

              {/* Posts */}
              {!loading && posts.length === 0 && (
                <div className="glass-card p-10 text-center">
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </div>
              )}

              <AnimatePresence>
                {!loading && posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: i < 5 ? i * 0.05 : 0 }}
                  >
                    <div className="glass-card-hover p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
                          {post.author_initials || "??"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{post.author_name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                        </div>
                      </div>
                      <p className="text-foreground leading-relaxed mb-4">{post.content}</p>
                      <div className="flex items-center gap-6 pt-3 border-t border-border/50">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${likedPosts.includes(post.id) ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <Heart className={`w-4 h-4 ${likedPosts.includes(post.id) ? "fill-current" : ""}`} />
                          {likedPosts.includes(post.id) ? 1 : 0}
                        </button>
                        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <MessageSquare className="w-4 h-4" /> 0
                        </button>
                        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <ScrollReveal delay={0.2}>
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan" /> Trending
                  </h3>
                  <div className="space-y-3">
                    {trending.map((t) => (
                      <div key={t.tag} className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-foreground">{t.tag}</span>
                        <span className="text-xs text-muted-foreground">{t.posts} posts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.3}>
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan" /> Active Members
                  </h3>
                  <div className="flex -space-x-2">
                    {["SW", "SU", "GR", "PH", "AN", "PR"].map((initials, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {initials}
                      </div>
                    ))}
                    <div className="w-9 h-9 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                      +2k
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
