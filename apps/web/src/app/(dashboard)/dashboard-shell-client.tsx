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
  "/braindump": "Brain Dump",
  "/compose": "Content Composer",
  "/coach": "AI Content Coach",
  "/analyze": "Algorithm Scorer",
  "/research": "Account Research",
  "/inspiration": "Inspirație",
  "/video-script": "Script Video",
  "/image-editor": "Editor Imagine",
  "/analytics": "Analiză",
  "/calendar": "Calendar Conținut",
  "/history": "Istoric Postări",
  "/settings": "Setări",
};

const pageBreadcrumbs: Record<string, { group: string; label: string }> = {
  "/braindump": { group: "Creează", label: "Brain Dump" },
  "/compose": { group: "Creează", label: "Compune" },
  "/coach": { group: "AI Tools", label: "AI Coach" },
  "/analyze": { group: "AI Tools", label: "Scorer" },
  "/research": { group: "AI Tools", label: "Cercetare" },
  "/inspiration": { group: "AI Tools", label: "Inspirație" },
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
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
            {breadcrumb && (
              <>
                <span className="text-xs text-muted-foreground">{breadcrumb.group}</span>
                <span className="text-xs text-muted-foreground">/</span>
              </>
            )}
            <h1 className="text-sm font-semibold">{title}</h1>
          </nav>

          {/* Right-side header actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* ⌘K search trigger */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition"
              aria-label="Deschide paleta de comenzi (Ctrl+K)"
            >
              <span className="hidden sm:inline">Caută...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">
                Ctrl+K
              </kbd>
            </button>

            {/* Notification center */}
            <NotificationCenter />
          </div>
        </header>

        {/* Network status banner */}
        <NetworkStatus />

        {/* Page content with route transition */}
        <div className="flex-1 p-6">
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
