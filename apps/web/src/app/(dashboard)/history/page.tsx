import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarDays,
  Filter,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Plus,
} from "lucide-react";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const hasAccounts = accounts && accounts.length > 0;

  // Demo posts for when the feature is connected
  const demoPosts = [
    {
      id: "1",
      platform: "facebook",
      text: "Cum am crescut engagement-ul cu 340% în 30 de zile...",
      likes: 234,
      comments: 45,
      shares: 12,
      views: 3200,
      date: "2026-02-08",
      score: 85,
      grade: "A",
    },
    {
      id: "2",
      platform: "instagram",
      text: "5 greșeli pe care le fac 90% din creatorii de conținut",
      likes: 567,
      comments: 89,
      shares: 34,
      views: 8900,
      date: "2026-02-07",
      score: 92,
      grade: "S",
    },
    {
      id: "3",
      platform: "tiktok",
      text: "POV: Când afli că AI-ul poate scrie mai bine decât tine...",
      likes: 1200,
      comments: 234,
      shares: 89,
      views: 45000,
      date: "2026-02-06",
      score: 78,
      grade: "B",
    },
    {
      id: "4",
      platform: "facebook",
      text: "De ce nu funcționează conținutul tău pe Facebook (și ce poți face)",
      likes: 123,
      comments: 23,
      shares: 8,
      views: 1800,
      date: "2026-02-05",
      score: 65,
      grade: "C",
    },
  ];

  const platformColors: Record<string, string> = {
    facebook: "bg-blue-500/10 text-blue-400",
    instagram: "bg-pink-500/10 text-pink-400",
    tiktok: "bg-gray-500/10 text-gray-300",
    youtube: "bg-red-500/10 text-red-400",
  };

  const gradeColors: Record<string, string> = {
    S: "bg-yellow-500/10 text-yellow-400",
    A: "bg-green-500/10 text-green-400",
    B: "bg-blue-500/10 text-blue-400",
    C: "bg-amber-500/10 text-amber-400",
    D: "bg-orange-500/10 text-orange-400",
    F: "bg-red-500/10 text-red-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Post History</h1>
            <p className="text-gray-400 text-sm">
              Analizează performanța postărilor tale
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:bg-white/[0.06] transition">
          <Filter className="w-4 h-4" /> Filtrează
        </button>
      </div>

      {!hasAccounts ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <CalendarDays className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Nicio postare încă
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Conectează-ți conturile sociale pentru a importa automat istoricul de
            postări și a vedea analiza performanței.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Conectează un cont
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-center">
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-xs text-gray-500 mt-1">Total postări</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-center">
              <div className="text-2xl font-bold text-white">--</div>
              <div className="text-xs text-gray-500 mt-1">Engagement mediu</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-center">
              <div className="text-2xl font-bold text-white">--</div>
              <div className="text-xs text-gray-500 mt-1">Cea mai bună zi</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-center">
              <div className="text-2xl font-bold text-white">--</div>
              <div className="text-xs text-gray-500 mt-1">Scor mediu</div>
            </div>
          </div>

          {/* Post list (demo data) */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-gray-300">
                Postări recente{" "}
                <span className="text-gray-500">(date demo)</span>
              </h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {demoPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition"
                >
                  <div
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${platformColors[post.platform]}`}
                  >
                    {post.platform}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{post.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{post.date}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> {post.shares}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />{" "}
                      {post.views > 1000
                        ? `${(post.views / 1000).toFixed(1)}K`
                        : post.views}
                    </span>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-bold ${gradeColors[post.grade]}`}
                  >
                    {post.grade} · {post.score}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-600" />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center">
            Datele de mai sus sunt demo. Postările reale vor apărea după prima
            sincronizare a conturilor.
          </p>
        </div>
      )}
    </div>
  );
}
