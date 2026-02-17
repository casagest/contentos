"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Brain,
  PenTool,
  Target,
  MessageSquare,
  Search,
  Lightbulb,
  BarChart3,
  Calendar,
  History,
  Settings,
  Video,
  Image,
  Sparkles,
  LogOut,
  User,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    label: "CREEAZĂ",
    items: [
      { title: "Brain Dump", url: "/braindump", icon: Brain },
      { title: "Compune", url: "/compose", icon: PenTool },
    ],
  },
  {
    label: "AI TOOLS",
    items: [
      { title: "AI Coach", url: "/coach", icon: MessageSquare },
      { title: "Scorer", url: "/analyze", icon: Target },
      { title: "Cercetare", url: "/research", icon: Search },
      { title: "Inspirație", url: "/inspiration", icon: Lightbulb },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { title: "Script Video", url: "/video-script", icon: Video },
      { title: "Editor Imagine", url: "/image-editor", icon: Image },
    ],
  },
  {
    label: "MONITORIZARE",
    items: [
      { title: "Analiză", url: "/analytics", icon: BarChart3 },
      { title: "Calendar", url: "/calendar", icon: Calendar },
      { title: "Istoric", url: "/history", icon: History },
    ],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  draftCount?: number
  scheduledCount?: number
}

export function AppSidebar({ draftCount, scheduledCount, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || "")
        setUserName(user.user_metadata?.full_name || "")
      }
    })
  }, [])

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/login")
  }

  const initials = userName
    ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail ? userEmail[0].toUpperCase() : "U"

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard/business" className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Content<span className="text-primary">OS</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.url
                  const Icon = item.icon
                  const badge =
                    item.url === "/compose" && draftCount
                      ? draftCount
                      : item.url === "/calendar" && scheduledCount
                        ? scheduledCount
                        : undefined

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.url}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badge !== undefined && badge > 0 && (
                        <SidebarMenuBadge>{badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Setări">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Setări</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User profile section */}
        <div className="px-2 py-2 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/20 border border-brand-500/30 text-brand-300 text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              {userName && (
                <p className="text-xs font-medium text-foreground truncate">{userName}</p>
              )}
              <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition group-data-[collapsible=icon]:hidden"
              title="Deconectare"
              aria-label="Deconectare"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
