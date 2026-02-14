import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/cron-auth";
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

export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe)
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Find all scheduled drafts that are due
    const now = new Date().toISOString();
    const { data: drafts, error: draftsError } = await supabase
      .from("drafts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(20); // Process max 20 per run to stay within timeout

    if (draftsError) {
      console.error("Cron: failed to fetch drafts:", draftsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ published: 0, failed: 0, message: "No drafts due." });
    }

    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || "";
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || "";

    let published = 0;
    let failed = 0;

    for (const draft of drafts) {
      const objective = resolveDraftObjective(draft);
      const targetPlatforms: string[] = draft.target_platforms || [];
      if (targetPlatforms.length === 0) {
        failed++;
        continue;
      }

      // Fetch social accounts for this org + platforms
      const { data: socialAccounts } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("organization_id", draft.organization_id)
        .eq("is_active", true)
        .in("platform", targetPlatforms);

      if (!socialAccounts || socialAccounts.length === 0) {
        console.error(`Cron: no social accounts for org ${draft.organization_id}`);
        failed++;
        continue;
      }

      let anySuccess = false;

      for (const account of socialAccounts) {
        const versionText = resolveDraftTextForPlatform(draft, account.platform);
        const content = {
          text: versionText,
          mediaUrls: draft.media_urls || [],
        };

        try {
          let result: { platformPostId: string; platformUrl: string };

          if (account.platform === "facebook") {
            const adapter = new FacebookAdapter({ appId, appSecret });
            result = await adapter.publishPost(account.access_token, content);
          } else if (account.platform === "instagram") {
            if (!content.mediaUrls || content.mediaUrls.length === 0) {
              continue; // Skip Instagram for text-only
            }
            const adapter = new InstagramAdapter({ appId, appSecret });
            result = await adapter.publishPost(account.access_token, content);
          } else if (account.platform === "tiktok") {
            const tiktokKey = process.env.TIKTOK_CLIENT_KEY || "";
            const tiktokSecret = process.env.TIKTOK_CLIENT_SECRET || "";
            if (!tiktokKey || !tiktokSecret) continue;
            const adapter = new TikTokAdapter({ clientKey: tiktokKey, clientSecret: tiktokSecret });
            result = await adapter.publishPost(account.access_token, content);
          } else if (account.platform === "linkedin") {
            const linkedinId = process.env.LINKEDIN_CLIENT_ID || "";
            const linkedinSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
            if (!linkedinId || !linkedinSecret) continue;
            const adapter = new LinkedInAdapter({ clientId: linkedinId, clientSecret: linkedinSecret });
            result = await adapter.publishPost(account.access_token, content);
          } else {
            continue;
          }

          // Insert post record
          const signals = deriveCreativeSignals({ text: content.text });
          const { data: insertedPost } = await supabase
            .from("posts")
            .insert({
              social_account_id: account.id,
              organization_id: draft.organization_id,
              platform: account.platform,
              platform_post_id: result.platformPostId,
              platform_url: result.platformUrl,
              content_type: "text",
              text_content: content.text,
              media_urls: draft.media_urls || [],
              hashtags: draft.hashtags || [],
              hook_type: signals.hookType,
              cta_type: signals.ctaType,
              published_at: new Date().toISOString(),
            })
            .select(
              "id,organization_id,social_account_id,platform,text_content,hook_type,cta_type,likes_count,comments_count,shares_count,saves_count,views_count,reach_count,impressions_count,engagement_rate,published_at"
            )
            .single();

          if (insertedPost?.id) {
            await logDecisionForPublishedPost({
              supabase,
              organizationId: draft.organization_id,
              userId: draft.created_by || null,
              routeKey: "cron:publish-scheduled",
              platform: account.platform,
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
                publishType: "scheduled",
                scheduledAt: draft.scheduled_at || null,
              },
            });

            const outcomeLogged = await logOutcomeForPost({
              supabase,
              post: insertedPost,
              source: "publish",
              eventType: "published",
              objective,
              metadata: {
                publishType: "scheduled",
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
                  publishType: "scheduled",
                },
              });
            }
          }

          anySuccess = true;
        } catch (err) {
          console.error(`Cron: publish failed for draft ${draft.id} on ${account.platform}:`, err);
        }
      }

      if (anySuccess) {
        await supabase
          .from("drafts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
          })
          .eq("id", draft.id);
        published++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({ published, failed, total: drafts.length });
  } catch (err) {
    console.error("Cron publish error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
