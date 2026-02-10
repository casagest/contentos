import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../(auth)/actions";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/coach", label: "AI Coach", icon: "🎯" },
  { href: "/compose", label: "Composer", icon: "✍️" },
  { href: "/analyze", label: "Scorer", icon: "📈" },
  { href: "/history", label: "Post History", icon: "📅" },
  { href: "/research", label: "Research", icon: "🔍" },
  { href: "/braindump", label: "Brain Dump", icon: "🧠" },
  { href: "/inspiration", label: "Inspirație", icon: "💡" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[#0A0A0F]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="text-lg font-bold text-white tracking-tight">ContentOS</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition"
          >
            <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-300 text-xs font-bold">
              {user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{user.email}</div>
              <div className="text-xs text-gray-500">Free Plan</div>
            </div>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] transition text-left"
            >
              Deconectare
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
