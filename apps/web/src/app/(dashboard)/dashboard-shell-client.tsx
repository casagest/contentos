"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../(auth)/actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquareText,
  PenTool,
  BarChart3,
  CalendarCheck,
  Clock,
  Search,
  Brain,
  Lightbulb,
  Film,
  Image as ImageIcon,
  Settings,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// NAVIGATION STRUCTURE — grouped with section labels
// ═══════════════════════════════════════════════════════════════

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "CREEAZĂ",
    items: [
      { href: "/braindump", label: "Brain Dump", icon: Brain },
      { href: "/compose", label: "Compune", icon: PenTool },
    ],
  },
  {
    label: "AI TOOLS",
    items: [
      { href: "/coach", label: "AI Coach", icon: MessageSquareText },
      { href: "/analyze", label: "Scorer", icon: BarChart3 },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { href: "/video-script", label: "Script Video", icon: Film },
      { href: "/image-editor", label: "Editor Imagine", icon: ImageIcon },
    ],
  },
  {
    label: "MONITORIZARE",
    items: [
      { href: "/analytics", label: "Analiză", icon: TrendingUp },
      { href: "/calendar", label: "Calendar", icon: CalendarCheck },
      { href: "/history", label: "Istoric", icon: Clock },
    ],
  },
  {
    label: "CERCETARE",
    items: [
      { href: "/research", label: "Cercetare", icon: Search },
      { href: "/inspiration", label: "Inspirație", icon: Lightbulb },
    ],
  },
];

export default function DashboardShellClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Load draft/scheduled counts for badges
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("organization_id").eq("id", user.id).single()
        .then(({ data }) => {
          if (!data?.organization_id) return;
          supabase.from("drafts").select("id, status").eq("organization_id", data.organization_id)
            .then(({ data: drafts }) => {
              if (!drafts) return;
              setDraftCount(drafts.filter((d) => d.status === "draft").length);
              setScheduledCount(drafts.filter((d) => d.status === "scheduled").length);
            });
        });
    });
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard")
      return pathname === "/dashboard" || pathname.startsWith("/dashboard");
    return pathname.startsWith(href);
  };

  const getBadge = (href: string): string | undefined => {
    if (href === "/calendar" && scheduledCount > 0) return String(scheduledCount);
    if (href === "/braindump" && draftCount > 0) return String(draftCount);
    return undefined;
  };

  const sidebar = (
    <>
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-shadow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight block leading-tight">
              ContentOS
            </span>
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">
              AI Marketing
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label || "main"}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[9px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badge = getBadge(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group/item flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative ${
                      active
                        ? "bg-brand-600/15 text-white font-medium"
                        : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-400"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-[16px] h-[16px] shrink-0 transition-colors ${
                      active ? "text-brand-400" : "text-gray-600 group-hover/item:text-gray-400"
                    }`} />
                    <span className="flex-1">{item.label}</span>
                    {badge && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold px-1">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 pt-2 border-t border-white/[0.04] space-y-0.5">
        <Link
          href="/settings"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
            pathname.startsWith("/settings")
              ? "bg-brand-600/15 text-white font-medium"
              : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
          }`}
        >
          <Settings className="w-[16px] h-[16px] text-gray-600" />
          <span>Setări</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150"
          >
            <LogOut className="w-[16px] h-[16px]" />
            <span>Deconectare</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#08080D]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] border-r border-white/[0.04] flex-col bg-[#0A0A0F]/80 backdrop-blur-xl">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-[#0A0A0F] border-r border-white/[0.04] flex flex-col transform transition-transform duration-250 ease-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-5 right-4 text-gray-600 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-[#08080D]/90 backdrop-blur-xl sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ContentOS</span>
          </Link>
        </div>

        {/* Page content with transition */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="max-w-6xl mx-auto p-6 md:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
