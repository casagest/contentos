import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacebookAdapter, InstagramAdapter } from "@contentos/content-engine/platforms/meta";
import { TikTokAdapter } from "@contentos/content-engine/platforms/tiktok";
import { LinkedInAdapter } from "@contentos/content-engine/platforms/linkedin";
import {
  deriveCreativeSignals,
  type AIObjective,
  logDecisionForPublishedPost,
  logOutcomeForPost,
  refreshCreativeMemoryFromPost,
} from "@/lib/ai/outcome-learning";

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function resolveDraftObjective(draft: Record<string, any>): AIObjective {
  const aiSuggestions = asRecord(draft?.ai_suggestions);
  const meta = asRecord(aiSuggestions.meta);
  const objective = typeof meta.objective === "string" ? meta.objective : "";
  if (objective === "reach" || objective === "leads" || objective === "saves") return objective;
  return "engagement";
}

function resolveDraftTextForPlatform(draft: Record<string, any>, platform: string): string {
  const platformVersions =
    typeof draft.platform_versions === "object" && draft.platform_versions !== null
      ? (draft.platform_versions as Record<string, unknown>)
      : {};
  const row =
    typeof platformVersions[platform] === "object" && platformVersions[platform] !== null
      ? (platformVersions[platform] as Record<string, unknown>)
      : {};
  const baseText =
    typeof row.text === "string" && row.text.trim().length > 0
      ? row.text.trim()
      : typeof draft.body === "string"
        ? draft.body
        : "";
  const alternatives = Array.isArray(row.alternativeVersions)
    ? row.alternativeVersions.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];
  const selectedVariant =
    typeof row.selectedVariant === "number" && Number.isFinite(row.selectedVariant)
      ? Math.max(0, Math.floor(row.selectedVariant))
      : 0;

  const candidates = [baseText, ...alternatives];
  return candidates[selectedVariant] || baseText;
}

async function getAuthContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return null;

  return { userId: user.id, orgId: userData.organization_id };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await getAuthContext(supabase);

    if (!auth) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { id } = await params;

    // Fetch draft
    const { data: draft, error: draftError } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.orgId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft-ul nu a fost găsit." },
        { status: 404 }
      );
    }

    if (draft.status === "published") {
      return NextResponse.json(
        { error: "Acest draft a fost deja publicat." },
        { status: 400 }
      );
    }

    const objective = resolveDraftObjective(draft);

    const targetPlatforms: string[] = draft.target_platforms || [];
    if (targetPlatforms.length === 0) {
      return NextResponse.json(
        { error: "Nicio platformă selectată pentru publicare." },
        { status: 400 }
      );
    }

    // Fetch social accounts for this org
    const { data: socialAccounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("organization_id", auth.orgId)
      .eq("is_active", true)
      .in("platform", targetPlatforms);

    if (!socialAccounts || socialAccounts.length === 0) {
      return NextResponse.json(
        { error: "Nu există conturi sociale conectate pentru platformele selectate." },
        { status: 400 }
      );
    }

    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || "";
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || "";

    const results: Array<{
      platform: string;
      success: boolean;
      platformPostId?: string;
      platformUrl?: string;
      error?: string;
      skipped?: boolean;
    }> = [];

    for (const account of socialAccounts) {
      const versionText = resolveDraftTextForPlatform(draft, account.platform);
      const content = {
        text: versionText,
        mediaUrls: draft.media_urls || [],
      };

      try {
        if (account.platform === "facebook") {
          const adapter = new FacebookAdapter({ appId, appSecret });
          const result = await adapter.publishPost(account.access_token, content);
          results.push({
            platform: "facebook",
            success: true,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          });
        } else if (account.platform === "instagram") {
          if (!content.mediaUrls || content.mediaUrls.length === 0) {
            results.push({
              platform: "instagram",
              success: false,
              skipped: true,
              error: "Instagram necesită cel puțin o imagine.",
            });
            continue;
          }
          const adapter = new InstagramAdapter({ appId, appSecret });
          const result = await adapter.publishPost(account.access_token, content);
          results.push({
            platform: "instagram",
            success: true,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          });
        } else if (account.platform === "tiktok") {
          const tiktokKey = process.env.TIKTOK_CLIENT_KEY || "";
          const tiktokSecret = process.env.TIKTOK_CLIENT_SECRET || "";
          if (!tiktokKey || !tiktokSecret) {
            results.push({ platform: "tiktok", success: false, error: "TikTok nu este configurat." });
            continue;
          }
          const adapter = new TikTokAdapter({ clientKey: tiktokKey, clientSecret: tiktokSecret });
          const result = await adapter.publishPost(account.access_token, content);
          results.push({
            platform: "tiktok",
            success: true,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          });
        } else if (account.platform === "linkedin") {
          const linkedinId = process.env.LINKEDIN_CLIENT_ID || "";
          const linkedinSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
          if (!linkedinId || !linkedinSecret) {
            results.push({ platform: "linkedin", success: false, error: "LinkedIn nu este configurat." });
            continue;
          }
          const adapter = new LinkedInAdapter({ clientId: linkedinId, clientSecret: linkedinSecret });
          const result = await adapter.publishPost(account.access_token, content);
          results.push({
            platform: "linkedin",
            success: true,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Eroare necunoscută";
        results.push({
          platform: account.platform,
          success: false,
          error: message,
        });
      }
    }

    const anySuccess = results.some((r) => r.success);

    // Insert into posts table for each successful publish
    for (const result of results) {
      if (!result.success || !result.platformPostId) continue;

      const account = socialAccounts.find((a) => a.platform === result.platform);
      if (!account) continue;
      const versionText = resolveDraftTextForPlatform(draft, account.platform);
      const signals = deriveCreativeSignals({ text: versionText });

      const draftMediaUrls: string[] = draft.media_urls || [];
      const videoExts = [".mp4", ".mov", ".avi", ".m4v", ".webm"];
      const hasVideo = draftMediaUrls.some((u: string) =>
        videoExts.some((ext) => u.toLowerCase().split("?")[0].endsWith(ext))
      );
      const detectedContentType =
        draftMediaUrls.length > 1
          ? "carousel"
          : hasVideo
            ? "reel"
            : draftMediaUrls.length === 1
              ? "image"
              : "text";

      const { data: insertedPost } = await supabase
        .from("posts")
        .insert({
          social_account_id: account.id,
          organization_id: auth.orgId,
          platform: result.platform,
          platform_post_id: result.platformPostId,
          platform_url: result.platformUrl,
          content_type: detectedContentType,
          text_content: versionText,
          media_urls: draftMediaUrls,
          hashtags: draft.hashtags || [],
          hook_type: signals.hookType,
          cta_type: signals.ctaType,
          published_at: new Date().toISOString(),
        })
        .select(
          "id,organization_id,social_account_id,platform,text_content,hook_type,cta_type,likes_count,comments_count,shares_count,saves_count,views_count,reach_count,impressions_count,engagement_rate,published_at"
        )
        .single();

      if (!insertedPost?.id) continue;

      await logDecisionForPublishedPost({
        supabase,
        organizationId: auth.orgId,
        userId: auth.userId,
        routeKey: "draft:publish",
        platform: result.platform as "facebook" | "instagram" | "tiktok" | "youtube" | "twitter",
        postId: insertedPost.id,
        draft: {
          id: draft.id,
          source: draft.source,
          algorithm_scores: draft.algorithm_scores,
          platform_versions: draft.platform_versions,
          ai_suggestions: draft.ai_suggestions,
        },
        objective,
        decisionContext: {
          publishType: "manual",
          draftStatusBeforePublish: draft.status,
        },
      });

      const outcomeLogged = await logOutcomeForPost({
        supabase,
        post: insertedPost,
        source: "publish",
        eventType: "published",
        objective,
        metadata: {
          publishType: "manual",
          platformPostId: result.platformPostId,
        },
      });

      if (outcomeLogged) {
        await refreshCreativeMemoryFromPost({
          supabase,
          post: insertedPost,
          objective,
          metadata: {
            source: "publish",
          },
        });
      }
    }

    // Update draft status
    if (anySuccess) {
      await supabase
        .from("drafts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    return NextResponse.json({
      success: anySuccess,
      results,
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json(
      { error: "Eroare la publicare." },
      { status: 500 }
    );
  }
}
