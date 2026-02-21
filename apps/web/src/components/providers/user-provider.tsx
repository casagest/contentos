"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserData {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  industry: string;
  initials: string;
}

interface UserContextValue {
  user: UserData | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true });

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || cancelled) {
          setLoading(false);
          return;
        }

        const fullName = authUser.user_metadata?.full_name || "";
        const email = authUser.email || "";
        const initials = fullName
          ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
          : email ? email[0].toUpperCase() : "U";

        // Fetch org + industry from organizations.settings JSONB
        let organizationId = "";
        let industry = "";

        const { data: userData } = await supabase
          .from("users")
          .select("organization_id")
          .eq("id", authUser.id)
          .single();

        if (userData?.organization_id) {
          organizationId = userData.organization_id;

          const { data: org } = await supabase
            .from("organizations")
            .select("settings")
            .eq("id", organizationId)
            .single();

          const settings = org?.settings as Record<string, unknown> | null;
          const businessProfile = settings?.businessProfile as Record<string, unknown> | null;
          if (businessProfile?.industry && typeof businessProfile.industry === "string") {
            industry = businessProfile.industry;
          }
        }

        if (!cancelled) {
          setUser({
            id: authUser.id,
            email,
            fullName,
            organizationId,
            industry,
            initials,
          });
        }
      } catch {
        // Silent — auth may not be available
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}
