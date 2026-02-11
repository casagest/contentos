import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FacebookAdapter, InstagramAdapter } from "@contentos/content-engine/platforms/meta";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
        const platformVersions = draft.platform_versions || {};
        const versionText = platformVersions[account.platform]?.text || draft.body || "";
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
          } else {
            continue;
          }

          // Insert post record
          await supabase.from("posts").insert({
            social_account_id: account.id,
            organization_id: draft.organization_id,
            platform: account.platform,
            platform_post_id: result.platformPostId,
            platform_url: result.platformUrl,
            content_type: "text",
            text_content: draft.body,
            media_urls: draft.media_urls || [],
            hashtags: draft.hashtags || [],
            published_at: new Date().toISOString(),
          });

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
