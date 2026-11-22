import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Heart, Share2, Send, Users, TrendingUp, Loader2, Pencil, Trash2, X, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Post {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_initials: string;
  created_at: string;
}

const postSchema = z.string().trim().min(1, "Post cannot be empty.").max(2000, "Post must be 2000 characters or fewer.");

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

const fetchPosts = async () => {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id, user_id, author_name, author_initials, content, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
};

const Community = () => {
  const queryClient = useQueryClient();
  const { data: posts, isLoading, error, refetch } = useQuery<Post[], Error>({
    queryKey: ['communityPosts'],
    queryFn: fetchPosts,
  });

  const [newPost, setNewPost] = useState("");
  const [postError, setPostError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();
  const currentUser = useMemo(() => {
    if (!user) return null;
    const name: string = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    return { id: user.id, name, initials };
  }, [user]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Realtime subscription for INSERT, UPDATE, DELETE
  useEffect(() => {
    const channel = supabase
      .channel("community_posts_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
        queryClient.setQueryData<Post[]>(['communityPosts'], (oldPosts = []) => [
          payload.new as Post,
          ...oldPosts,
        ]);
      })
       .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload) => {
         queryClient.setQueryData<Post[]>(['communityPosts'], (oldPosts = []) =>
           oldPosts.map((p) =>
             p.id === (payload.new as Post).id ? (payload.new as Post) : p
           )
         );
       })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload) => {
        queryClient.setQueryData<Post[]>(['communityPosts'], (oldPosts = []) =>
          oldPosts.filter((p) => p.id !== (payload.old as Partial<Post>).id)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handlePost = async () => {
    const parsed = postSchema.safeParse(newPost);
    if (!parsed.success) { setPostError(parsed.error.issues[0].message); return; }
    setPostError(null);
    if (!currentUser) {
      toast({ title: "Please sign in", description: "You need to be logged in to post.", variant: "destructive" });
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: currentUser.id,
      content: parsed.data,
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

  const handleEdit = async (postId: string) => {
    const parsed = postSchema.safeParse(editContent);
    if (!parsed.success) { setEditError(parsed.error.issues[0].message); return; }
    setEditError(null);
    const { error } = await supabase
      .from("community_posts")
      .update({ content: parsed.data })
      .eq("id", postId);
    if (error) {
      toast({ title: "Error", description: "Failed to update post.", variant: "destructive" });
    } else {
      // Update the query data to reflect the change
      queryClient.setQueryData<Post[]>(['communityPosts'], (oldPosts = []) =>
        oldPosts.map((p) => p.id === postId ? { ...p, content: parsed.data } : p)
      );
      setEditingPostId(null);
      setEditContent("");
    }
  };

  const handleDelete = async (postId: string) => {
    setDeletingPostId(postId);
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    } else {
      // Remove the post from the query data
      queryClient.setQueryData<Post[]>(['communityPosts'], (oldPosts = []) =>
        oldPosts.filter((p) => p.id !== postId)
      );
    }
    setDeletingPostId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <ScrollReveal>
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Community Hub
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
                  <label htmlFor="new-post" className="sr-only">Share your impact story</label>
                  <textarea
                    id="new-post"
                    value={newPost}
                    maxLength={2100}
                    aria-invalid={!!postError}
                    aria-describedby={postError ? "new-post-error" : undefined}
                    onChange={(e) => { setNewPost(e.target.value); setPostError(null); }}
                    placeholder={currentUser ? "Share your impact story..." : "Sign in to share your story..."}
                    disabled={!currentUser}
                    className="w-full bg-secondary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow disabled:opacity-50"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handlePost(); }}
                  />
                  {postError && <p id="new-post-error" role="alert" className="text-sm text-destructive mt-2">{postError}</p>}
                  <div className="flex justify-end mt-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePost}
                      disabled={posting || !currentUser || !newPost.trim()}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground flex items-center gap-2 disabled:opacity-50"
                    >
                      {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Post
                    </motion.button>
                  </div>
                </div>
              </ScrollReveal>

              {/* Loading Skeletons */}
              {isLoading && (
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
              {!isLoading && error && (
                <div className="glass-card p-10 text-center" role="alert">
                  <p className="text-foreground font-semibold mb-2">Could not load posts</p>
                  <p className="text-muted-foreground text-sm mb-4">{error.message}</p>
                  <button
                    onClick={() => refetch()}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isLoading && !error && (posts ?? []).length === 0 && (
                <div className="glass-card p-10 text-center">
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </div>
              )}

               <AnimatePresence>
                 {!isLoading && (posts ?? []).map((post, i) => {
                  const isOwner = currentUser?.id === post.user_id;
                  const isEditing = editingPostId === post.id;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: i < 5 ? i * 0.05 : 0 }}
                    >
                      <div className="glass-card-hover p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
                              {post.author_initials || "??"}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{post.author_name || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                            </div>
                          </div>

                          {/* Edit/Delete buttons for post owner */}
                          {isOwner && !isEditing && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                title="Edit post"
                                aria-label="Edit post"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={deletingPostId === post.id}
                                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                title="Delete post"
                                aria-label="Delete post"
                              >
                                {deletingPostId === post.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Post content or edit form */}
                        {isEditing ? (
                          <div className="mb-4">
                            <label htmlFor={`edit-${post.id}`} className="sr-only">Edit post</label>
                            <textarea
                              id={`edit-${post.id}`}
                              value={editContent}
                              maxLength={2100}
                              aria-invalid={!!editError}
                              onChange={(e) => { setEditContent(e.target.value); setEditError(null); }}
                              className="w-full bg-secondary/50 rounded-xl p-3 text-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow text-sm"
                              autoFocus
                            />
                            {editError && <p role="alert" className="text-sm text-destructive mt-2">{editError}</p>}
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => { setEditingPostId(null); setEditContent(""); }}
                                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel
                              </button>
                              <button
                                onClick={() => handleEdit(post.id)}
                                disabled={!editContent.trim()}
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-foreground leading-relaxed mb-4">{post.content}</p>
                        )}

                        <div className="flex items-center gap-6 pt-3 border-t border-border/50">
                          {[
                            { Icon: Heart, label: "Like" },
                            { Icon: MessageSquare, label: "Comment" },
                            { Icon: Share2, label: "Share" },
                          ].map(({ Icon, label }) => (
                            <button
                              key={label}
                              disabled
                              title={`${label} - coming soon`}
                              aria-label={`${label} (coming soon)`}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
                            >
                              <Icon className="w-4 h-4" /> {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <ScrollReveal delay={0.2}>
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Trending
                  </h3>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.3}>
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Active Members
                  </h3>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
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