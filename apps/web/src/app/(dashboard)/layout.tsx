"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../(auth)/actions";
import {
  LayoutDashboard,
  MessageSquareText,
  PenTool,
  BarChart3,
  CalendarDays,
  Search,
  Brain,
  Lightbulb,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard/business", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach", label: "AI Coach", icon: MessageSquareText },
  { href: "/compose", label: "Composer", icon: PenTool },
  { href: "/analyze", label: "Scorer", icon: BarChart3 },
  { href: "/history", label: "Post History", icon: CalendarDays },
  { href: "/research", label: "Research", icon: Search },
  { href: "/braindump", label: "Brain Dump", icon: Brain },
  { href: "/inspiration", label: "Inspirație", icon: Lightbulb },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard/business")
      return pathname === "/dashboard" || pathname.startsWith("/dashboard");
    return pathname.startsWith(href);
  };

  const sidebar = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            ContentOS
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? "bg-brand-600/15 text-brand-300 font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/[0.06] space-y-1">
        <Link
          href="/settings"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
            pathname.startsWith("/settings")
              ? "bg-brand-600/15 text-brand-300"
              : "hover:bg-white/[0.04]"
          }`}
        >
          <Settings className="w-[18px] h-[18px] text-gray-400" />
          <span className="text-sm text-gray-300">Setări</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="text-sm">Deconectare</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#0A0A0F]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/[0.06] flex-col">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0F] border-r border-white/[0.06] flex flex-col transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-[10px]">
              C
            </div>
            <span className="text-sm font-bold text-white">ContentOS</span>
          </Link>
        </div>
        <div className="max-w-6xl mx-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
