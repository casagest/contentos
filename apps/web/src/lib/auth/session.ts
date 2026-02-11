/**
 * Auth session helpers — least privilege, no anonymous fallback.
 * Throws NextResponse for 401/403/404; never returns partial data.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email?: string;
};

export type SessionWithOrg = SessionUser & {
  organizationId: string;
};

/**
 * Get authenticated user. Returns 401 if no session.
 */
export async function getSessionUser(): Promise<
  { user: SessionUser; supabase: Awaited<ReturnType<typeof createClient>> } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  return {
    user: { id: user.id, email: user.email },
    supabase,
  };
}

/**
 * Get authenticated user with organization. Returns 401 if no session, 404 if no org.
 */
export async function getSessionUserWithOrg(): Promise<
  { user: SessionUser; organizationId: string; supabase: Awaited<ReturnType<typeof createClient>> } | NextResponse
> {
  const result = await getSessionUser();
  if (result instanceof NextResponse) return result;

  const { data: userData } = await result.supabase
    .from("users")
    .select("organization_id")
    .eq("id", result.user.id)
    .single();

  if (!userData?.organization_id) {
    return NextResponse.json(
      { error: "Organizație nu a fost găsită." },
      { status: 404 }
    );
  }

  return {
    user: result.user,
    organizationId: userData.organization_id,
    supabase: result.supabase,
  };
}
