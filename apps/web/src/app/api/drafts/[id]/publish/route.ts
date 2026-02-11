import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacebookAdapter, InstagramAdapter } from "@contentos/content-engine/platforms/meta";

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
      const platformVersions = draft.platform_versions || {};
      const versionText = platformVersions[account.platform]?.text || draft.body || "";
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

      await supabase.from("posts").insert({
        social_account_id: account.id,
        organization_id: auth.orgId,
        platform: result.platform,
        platform_post_id: result.platformPostId,
        platform_url: result.platformUrl,
        content_type: "text",
        text_content: draft.body,
        media_urls: draft.media_urls || [],
        hashtags: draft.hashtags || [],
        published_at: new Date().toISOString(),
      });
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
