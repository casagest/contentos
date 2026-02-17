"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";

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

export default function DashboardShellClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 dashboard-fade-in">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
