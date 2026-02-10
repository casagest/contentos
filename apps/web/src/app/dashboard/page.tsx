import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Users,
  FileText,
  TrendingUp,
  Zap,
  Brain,
  MessageSquareText,
  PenTool,
  Search,
  Wifi,
} from "lucide-react";

export const metadata = {
  title: "Dashboard — ContentOS",
};

const stats = [
  {
    label: "Conturi Conectate",
    value: "0",
    icon: Users,
    iconBg: "bg-brand-500/10",
    iconColor: "text-brand-400",
  },
  {
    label: "Postări Analizate",
    value: "0",
    icon: FileText,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
  },
  {
    label: "Engagement Mediu",
    value: "--",
    icon: TrendingUp,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
  },
  {
    label: "Scor AI",
    value: "--",
    icon: Zap,
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-400",
  },
];

const quickActions = [
  {
    href: "/braindump",
    label: "Brain Dump",
    desc: "Transformă idei brute în postări optimizate",
    icon: Brain,
    gradient: "from-purple-600 to-purple-700",
  },
  {
    href: "/coach",
    label: "AI Coach",
    desc: "Strategie de conținut personalizată cu AI",
    icon: MessageSquareText,
    gradient: "from-emerald-600 to-emerald-700",
  },
  {
    href: "/compose",
    label: "Compune",
    desc: "Creează conținut optimizat pentru orice platformă",
    icon: PenTool,
    gradient: "from-brand-600 to-brand-700",
  },
  {
    href: "/research",
    label: "Cercetare",
    desc: "Analizează ce funcționează la alți creatori",
    icon: Search,
    gradient: "from-cyan-600 to-cyan-700",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      {/* Mesaj de bun venit */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Bine ai venit{user?.email ? `, ${user.email}` : ""}
        </h1>
        <p className="text-gray-400 mt-1">
          Iată un rezumat al activității tale pe platforme.
        </p>
      </div>

      {/* Carduri statistici */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* CTA: Conectează conturile */}
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-600/10 flex items-center justify-center mx-auto mb-4">
          <Wifi className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Conectează-ți conturile sociale
        </h2>
        <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
          ContentOS are nevoie de acces la conturile tale pentru a analiza
          performanța și a genera conținut optimizat.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition shadow-lg shadow-brand-500/25"
        >
          Conectează conturi
        </Link>
      </div>

      {/* Acțiuni rapide */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Acțiuni rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/30 transition text-center"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-brand-300 transition">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {action.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
