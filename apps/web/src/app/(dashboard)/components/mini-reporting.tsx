"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  FileText,
  ThumbsUp,
  MessageCircle,
  Share2,
  Eye,
  Award,
} from "lucide-react";
import { CountUp, Skeleton, FadeIn, GlowCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface PostStats {
  totalPosts: number;
  thisMonthPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalImpressions: number;
  avgEngagement: number;
  bestPost: {
    text: string;
    platform: string;
    engagement: number;
    url: string | null;
  } | null;
  platformBreakdown: Record<string, number>;
  draftsCount: number;
  scheduledCount: number;
}

function getEngagement(post: { likes_count?: number | null; comments_count?: number | null; shares_count?: number | null }): number {
  return (post.likes_count || 0) + (post.comments_count || 0) + (post.shares_count || 0);
}

export default function MiniReporting({ className = "" }: { className?: string }) {
  const [stats, setStats] = useState<PostStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from("users")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (!userData?.organization_id) return;
        const orgId = userData.organization_id;

        // Fetch posts
        const { data: posts } = await supabase
          .from("posts")
          .select("id, platform, text_content, likes_count, comments_count, shares_count, impressions_count, platform_url, published_at")
          .eq("organization_id", orgId)
          .order("published_at", { ascending: false });

        // Fetch drafts
        const { data: drafts } = await supabase
          .from("drafts")
          .select("id, status")
          .eq("organization_id", orgId);

        const allPosts = posts || [];
        const allDrafts = drafts || [];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonthPosts = allPosts.filter((p) => {
          if (!p.published_at) return false;
          return new Date(p.published_at) >= monthStart;
        });

        const totalLikes = allPosts.reduce((s, p) => s + (p.likes_count || 0), 0);
        const totalComments = allPosts.reduce((s, p) => s + (p.comments_count || 0), 0);
        const totalShares = allPosts.reduce((s, p) => s + (p.shares_count || 0), 0);
        const totalImpressions = allPosts.reduce((s, p) => s + (p.impressions_count || 0), 0);
        const totalEngagement = totalLikes + totalComments + totalShares;
        const avgEngagement = allPosts.length > 0 ? Math.round(totalEngagement / allPosts.length) : 0;

        // Best post
        let bestPost: PostStats["bestPost"] = null;
        if (allPosts.length > 0) {
          const sorted = [...allPosts].sort((a, b) => getEngagement(b) - getEngagement(a));
          const top = sorted[0];
          bestPost = {
            text: (top.text_content || "").slice(0, 80),
            platform: top.platform || "unknown",
            engagement: getEngagement(top),
            url: top.platform_url,
          };
        }

        // Platform breakdown
        const platformBreakdown: Record<string, number> = {};
        for (const p of allPosts) {
          const platform = p.platform || "unknown";
          platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
        }

        setStats({
          totalPosts: allPosts.length,
          thisMonthPosts: thisMonthPosts.length,
          totalLikes,
          totalComments,
          totalShares,
          totalImpressions,
          avgEngagement,
          bestPost,
          platformBreakdown,
          draftsCount: allDrafts.filter((d) => d.status === "draft").length,
          scheduledCount: allDrafts.filter((d) => d.status === "scheduled").length,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className={`rounded-xl bg-card border border-border overflow-hidden ${className}`}>
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-muted">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#0a0a0a] p-3 flex flex-col items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-2 w-16" />
            </div>
          ))}
        </div>
        <div className="p-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const PLATFORM_COLORS: Record<string, string> = {
    facebook: "text-blue-400",
    instagram: "text-pink-400",
    tiktok: "text-white",
    youtube: "text-red-400",
    linkedin: "text-blue-300",
  };

  return (
    <FadeIn>
    <div className={`rounded-xl bg-card border border-border overflow-hidden hover:border-border transition-colors ${className}`}>
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-medium text-white">Raport Rapid</h3>
        </div>
        <p className="text-[10px] text-muted-foreground">Performanța contului tău</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-muted">
        <div className="bg-[#08080D] p-3 text-center">
          <FileText className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-white"><CountUp value={stats.thisMonthPosts} duration={1} /></p>
          <p className="text-[10px] text-muted-foreground">Postări luna asta</p>
        </div>
        <div className="bg-[#08080D] p-3 text-center">
          <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-white"><CountUp value={stats.totalLikes} /></p>
          <p className="text-[10px] text-muted-foreground">Like-uri total</p>
        </div>
        <div className="bg-[#08080D] p-3 text-center">
          <MessageCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-white"><CountUp value={stats.totalComments} /></p>
          <p className="text-[10px] text-muted-foreground">Comentarii</p>
        </div>
        <div className="bg-[#08080D] p-3 text-center">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-white"><CountUp value={stats.avgEngagement} /></p>
          <p className="text-[10px] text-muted-foreground">Eng. mediu/post</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Pipeline */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Pipeline:</span>
          <div className="flex gap-3">
            <span className="text-yellow-400">{stats.draftsCount} draft-uri</span>
            <span className="text-blue-400">{stats.scheduledCount} programate</span>
            <span className="text-emerald-400">{stats.totalPosts} publicate</span>
          </div>
        </div>

        {/* Platform breakdown */}
        {Object.keys(stats.platformBreakdown).length > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Platforme:</span>
            <div className="flex gap-2">
              {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
                <span key={platform} className={PLATFORM_COLORS[platform] || "text-foreground/80"}>
                  {platform}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Impressions */}
        {stats.totalImpressions > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> Impresii:</span>
            <span className="text-white font-medium">{stats.totalImpressions.toLocaleString("ro-RO")}</span>
          </div>
        )}

        {/* Shares */}
        {stats.totalShares > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1"><Share2 className="w-3 h-3" /> Distribuiri:</span>
            <span className="text-white font-medium">{stats.totalShares}</span>
          </div>
        )}

        {/* Best post */}
        {stats.bestPost && stats.bestPost.engagement > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-medium text-amber-300 uppercase tracking-wider">Cea mai bună postare</span>
            </div>
            <p className="text-xs text-foreground/80 line-clamp-2">{stats.bestPost.text}...</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] ${PLATFORM_COLORS[stats.bestPost.platform] || "text-muted-foreground"}`}>
                {stats.bestPost.platform}
              </span>
              <span className="text-[10px] text-amber-400 font-medium">
                {stats.bestPost.engagement} engagement
              </span>
              {stats.bestPost.url && (
                <a
                  href={stats.bestPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-brand-400 hover:text-brand-300 underline"
                >
                  Vezi postarea →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.totalPosts === 0 && stats.draftsCount === 0 && (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nicio postare încă</p>
            <p className="text-[10px] text-muted-foreground">Creează primul tău draft din Brain Dump sau Compune</p>
          </div>
        )}
      </div>
    </div>
    </FadeIn>
  );
}
