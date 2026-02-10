// packages/content-engine/src/ingestion/pipeline.ts
// ============================================================
// Post Ingestion Pipeline
// ============================================================

import type { PlatformAdapter, Post, Platform, IngestionJob } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

export class IngestionPipeline {
  private supabase: SupabaseClient;
  private adapters: Map<Platform, PlatformAdapter>;

  constructor(supabase: SupabaseClient, adapters: Map<Platform, PlatformAdapter>) {
    this.supabase = supabase;
    this.adapters = adapters;
  }

  /**
   * Ingest all posts from a social account
   * Called after initial OAuth connection or periodic sync
   */
  async ingestAccount(params: {
    socialAccountId: string;
    organizationId: string;
    platform: Platform;
    accessToken: string;
    since?: Date;
  }): Promise<IngestionJob> {
    const { socialAccountId, organizationId, platform, accessToken, since } = params;
    const adapter = this.adapters.get(platform);

    if (!adapter) {
      throw new Error(`No adapter for platform: ${platform}`);
    }

    // Update sync status
    await this.supabase
      .from("social_accounts")
      .update({ sync_status: "syncing" })
      .eq("id", socialAccountId);

    const job: IngestionJob = {
      id: crypto.randomUUID(),
      socialAccountId,
      organizationId,
      platform,
      status: "running",
      postsIngested: 0,
      startedAt: new Date(),
    };

    try {
      let cursor: string | undefined;
      let hasMore = true;
      let totalIngested = 0;

      while (hasMore) {
        const result = await adapter.fetchPosts(accessToken, {
          limit: 25,
          after: cursor,
          since,
        });

        if (result.posts.length > 0) {
          // Batch insert posts
          const postsToInsert = result.posts.map((post) => ({
            ...post,
            social_account_id: socialAccountId,
            organization_id: organizationId,
            published_at: post.publishedAt.toISOString(),
            raw_data: post.rawData || {},
          }));

          const { error } = await this.supabase
            .from("posts")
            .upsert(postsToInsert, {
              onConflict: "social_account_id,platform_post_id",
            });

          if (error) {
            console.error(`Ingestion error for batch:`, error);
          } else {
            totalIngested += result.posts.length;
          }
        }

        cursor = result.nextCursor;
        hasMore = result.hasMore;

        // Rate limit protection — wait between batches
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update sync status
      await this.supabase
        .from("social_accounts")
        .update({
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq("id", socialAccountId);

      job.status = "completed";
      job.postsIngested = totalIngested;
      job.completedAt = new Date();

      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await this.supabase
        .from("social_accounts")
        .update({
          sync_status: "error",
          sync_error: errorMessage,
        })
        .eq("id", socialAccountId);

      job.status = "failed";
      job.error = errorMessage;

      return job;
    }
  }
}
