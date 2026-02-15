import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, Send, Users, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const posts = [
  {
    id: 1, author: "Sarah Chen", avatar: "SC", time: "2h ago",
    content: "Just completed a 12-hour beach cleanup in Bali! 🌊 Over 200kg of plastic collected with an amazing team. Every small action counts!",
    likes: 142, comments: 23, tags: ["Environment", "Beach Cleanup"],
  },
  {
    id: 2, author: "Marcus Johnson", avatar: "MJ", time: "5h ago",
    content: "Our Code for Good hackathon built 3 apps for local nonprofits this weekend. So proud of what we achieved together! 💻🎉",
    likes: 98, comments: 15, tags: ["Technology", "Hackathon"],
  },
  {
    id: 3, author: "Aisha Patel", avatar: "AP", time: "1d ago",
    content: "Mentored 5 students today in STEM subjects. Seeing their eyes light up when concepts click — that's the real reward. ✨",
    likes: 231, comments: 34, tags: ["Education", "Mentorship"],
  },
];

const trending = [
  { tag: "#ClimateAction", posts: "1.2k" },
  { tag: "#CodeForGood", posts: "890" },
  { tag: "#YouthMentorship", posts: "654" },
  { tag: "#EmergencyRelief", posts: "432" },
];

const Community = () => {
  const [newPost, setNewPost] = useState("");
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const toggleLike = (id: number) => {
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
                    placeholder="Share your impact story..."
                    className="w-full bg-secondary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-cyan/30 transition-shadow"
                  />
                  <div className="flex justify-end mt-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground flex items-center gap-2"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Send className="w-4 h-4" /> Post
                    </motion.button>
                  </div>
                </div>
              </ScrollReveal>

              {/* Posts */}
              {posts.map((post, i) => (
                <ScrollReveal key={post.id} delay={i * 0.1}>
                  <div className="glass-card-hover p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
                        {post.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{post.author}</p>
                        <p className="text-xs text-muted-foreground">{post.time}</p>
                      </div>
                    </div>
                    <p className="text-foreground leading-relaxed mb-4">{post.content}</p>
                    <div className="flex gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-6 pt-3 border-t border-border/50">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${likedPosts.includes(post.id) ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Heart className={`w-4 h-4 ${likedPosts.includes(post.id) ? "fill-current" : ""}`} />
                        {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                      </button>
                      <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <MessageSquare className="w-4 h-4" /> {post.comments}
                      </button>
                      <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
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
                    {["AL", "BK", "CM", "DS", "EF", "GH"].map((initials, i) => (
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
