import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toStartOfDayIso(input: string): string {
  if (input.includes("T")) return input;
  return `${input}T00:00:00.000Z`;
}

function toEndOfDayIso(input: string): string {
  if (input.includes("T")) return input;
  return `${input}T23:59:59.999Z`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "Nu s-a găsit organizația." },
        { status: 400 }
      );
    }

    const orgId = userData.organization_id;
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const startIso = start ? toStartOfDayIso(start) : null;
    const endIso = end ? toEndOfDayIso(end) : null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Calendar view needs both scheduled drafts (by scheduled_at)
    // and unscheduled drafts (by created_at) in the same date window.
    if (status === "all" && (startIso || endIso)) {
      let scheduledQuery = supabase
        .from("drafts")
        .select("*", { count: "exact" })
        .eq("organization_id", orgId)
        .eq("status", "scheduled");

      if (startIso) {
        scheduledQuery = scheduledQuery.gte("scheduled_at", startIso);
      }
      if (endIso) {
        scheduledQuery = scheduledQuery.lte("scheduled_at", endIso);
      }

      let unscheduledQuery = supabase
        .from("drafts")
        .select("*", { count: "exact" })
        .eq("organization_id", orgId)
        .neq("status", "scheduled");

      if (startIso) {
        unscheduledQuery = unscheduledQuery.gte("created_at", startIso);
      }
      if (endIso) {
        unscheduledQuery = unscheduledQuery.lte("created_at", endIso);
      }

      const [
        {
          data: scheduledDrafts,
          count: scheduledCount,
          error: scheduledError,
        },
        {
          data: unscheduledDrafts,
          count: unscheduledCount,
          error: unscheduledError,
        },
      ] = await Promise.all([scheduledQuery, unscheduledQuery]);

      if (scheduledError || unscheduledError) {
        console.error("Drafts query error:", scheduledError || unscheduledError);
        return NextResponse.json(
          { error: "Eroare la preluarea draft-urilor." },
          { status: 500 }
        );
      }

      const merged = [...(scheduledDrafts || []), ...(unscheduledDrafts || [])]
        .sort((a, b) => {
          const aIsScheduled = a.status === "scheduled" && a.scheduled_at;
          const bIsScheduled = b.status === "scheduled" && b.scheduled_at;

          if (aIsScheduled && bIsScheduled) {
            return (
              new Date(a.scheduled_at as string).getTime() -
              new Date(b.scheduled_at as string).getTime()
            );
          }
          if (aIsScheduled) return -1;
          if (bIsScheduled) return 1;
          return (
            new Date(b.created_at as string).getTime() -
            new Date(a.created_at as string).getTime()
          );
        })
        .slice(offset, offset + limit);

      return NextResponse.json({
        drafts: merged,
        total: (scheduledCount || 0) + (unscheduledCount || 0),
      });
    }

    let query = supabase
      .from("drafts")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const rangeColumn = status === "scheduled" ? "scheduled_at" : "created_at";
    if (startIso) {
      query = query.gte(rangeColumn, startIso);
    }

    if (endIso) {
      query = query.lte(rangeColumn, endIso);
    }

    const { data: drafts, count, error } = await query;

    if (error) {
      console.error("Drafts query error:", error);
      return NextResponse.json(
        { error: "Eroare la preluarea draft-urilor." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      drafts: drafts || [],
      total: count || 0,
    });
  } catch (err) {
    console.error("Drafts API error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "Nu s-a găsit organizația." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      title,
      body: draftBody,
      hashtags,
      target_platforms,
      platform_versions,
      algorithm_scores,
      scheduled_at,
      source,
    } = body;

    if (!draftBody || !target_platforms?.length) {
      return NextResponse.json(
        { error: "Conținutul și platforma sunt obligatorii." },
        { status: 400 }
      );
    }

    const draftData = {
      organization_id: userData.organization_id,
      created_by: user.id,
      title: title || null,
      body: draftBody,
      hashtags: hashtags || [],
      target_platforms,
      platform_versions: platform_versions || {},
      algorithm_scores: algorithm_scores || {},
      status: scheduled_at ? "scheduled" : "draft",
      scheduled_at: scheduled_at || null,
      source: source || "manual",
      media_urls: [],
      ai_suggestions: {},
      requires_patient_consent: false,
    };

    const { data: draft, error } = await supabase
      .from("drafts")
      .insert(draftData)
      .select()
      .single();

    if (error) {
      console.error("Draft insert error:", error);
      return NextResponse.json(
        { error: "Eroare la salvarea draft-ului." },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft }, { status: 201 });
  } catch (err) {
    console.error("Draft create error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}
