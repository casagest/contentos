"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatus } from "@/components/network-status";

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
        </header>

        {/* Network status banner */}
        <NetworkStatus />

        {/* Page content */}
        <div className="flex-1 p-6 dashboard-fade-in">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
