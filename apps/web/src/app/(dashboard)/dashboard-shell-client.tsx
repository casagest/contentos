"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatus } from "@/components/network-status";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";

const pageTitles: Record<string, string> = {
  "/dashboard": "Command Center",
  "/dashboard/command-center": "Command Center",
  "/dashboard/business": "Dashboard Business",
  "/braindump": "Brain Dump",
  "/compose": "Compune",
  "/coach": "Antrenor AI",
  "/analyze": "Analiză",
  "/research": "Cercetare Conturi",
  "/inspiration": "Inspirație",
  "/video-script": "Script Video",
  "/image-editor": "Editor Imagine",
  "/analytics": "Analiză",
  "/calendar": "Calendar Conținut",
  "/history": "Istoric Postări",
  "/settings": "Setări",
};

const pageBreadcrumbs: Record<string, { group: string; label: string }> = {
  "/dashboard": { group: "Home", label: "Command Center" },
  "/dashboard/command-center": { group: "Home", label: "Command Center" },
  "/dashboard/business": { group: "Home", label: "Dashboard Business" },
  "/braindump": { group: "Creează", label: "Brain Dump" },
  "/compose": { group: "Creează", label: "Compune" },
  "/coach": { group: "Instrumente AI", label: "Antrenor AI" },
  "/analyze": { group: "Instrumente AI", label: "Analiză" },
  "/research": { group: "Instrumente AI", label: "Cercetare" },
  "/inspiration": { group: "Instrumente AI", label: "Inspirație" },
  "/video-script": { group: "Media", label: "Script Video" },
  "/image-editor": { group: "Media", label: "Editor Imagine" },
  "/analytics": { group: "Monitorizare", label: "Analiză" },
  "/calendar": { group: "Monitorizare", label: "Calendar" },
  "/history": { group: "Monitorizare", label: "Istoric" },
  "/settings": { group: "Cont", label: "Setări" },
};

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
    </div>
  );
}

export default function DashboardShellClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";
  const breadcrumb = pageBreadcrumbs[pathname];

  return (
    <SidebarProvider>
      <AppSidebar />
      <CommandPalette />
      <SidebarInset>
        {/* Top bar — glass morphism */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
            {breadcrumb && (
              <>
                <span className="text-xs text-muted-foreground/70">{breadcrumb.group}</span>
                <span className="text-xs text-muted-foreground/40">/</span>
              </>
            )}
            <h1 className="font-display text-sm font-semibold tracking-tight">{title}</h1>
          </nav>

          {/* Right-side header actions */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* ⌘K search trigger */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
              aria-label="Deschide paleta de comenzi (Ctrl+K)"
            >
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span className="hidden sm:inline">Caută...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-mono text-muted-foreground/50 border border-white/[0.06]">
                ⌘K
              </kbd>
            </button>

            {/* Notification center */}
            <NotificationCenter />
          </div>
        </header>

        {/* Network status banner */}
        <NetworkStatus />

        {/* Page content with route transition */}
        <main id="main-content" className="flex-1 p-6">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
