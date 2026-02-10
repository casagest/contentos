"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  TrendingUp,
  Users,
  Calendar,
  ExternalLink,
  X,
} from "lucide-react";

interface Competitor {
  id: string;
  username: string;
  platform: string;
  followers: string;
  avgEngagement: string;
  postsPerWeek: number;
  topTopics: string[];
  bestTimes: string[];
}

const demoCompetitors: Competitor[] = [
  {
    id: "1",
    username: "@creator.romania",
    platform: "instagram",
    followers: "45.2K",
    avgEngagement: "4.8%",
    postsPerWeek: 5,
    topTopics: ["lifestyle", "travel", "food"],
    bestTimes: ["Luni 10:00", "Miercuri 18:00", "Vineri 12:00"],
  },
  {
    id: "2",
    username: "ContentPro RO",
    platform: "facebook",
    followers: "12.8K",
    avgEngagement: "3.2%",
    postsPerWeek: 3,
    topTopics: ["marketing", "tips", "business"],
    bestTimes: ["Marți 09:00", "Joi 14:00"],
  },
  {
    id: "3",
    username: "@viral.romania",
    platform: "tiktok",
    followers: "120K",
    avgEngagement: "8.5%",
    postsPerWeek: 7,
    topTopics: ["humor", "trends", "challenges"],
    bestTimes: ["Zilnic 19:00-21:00"],
  },
];

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400",
  instagram: "bg-pink-500/10 text-pink-400",
  tiktok: "bg-gray-500/10 text-gray-300",
  youtube: "bg-red-500/10 text-red-400",
};

export default function ResearchPage() {
  const [competitors, setCompetitors] =
    useState<Competitor[]>(demoCompetitors);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPlatform, setNewPlatform] = useState("instagram");

  const addCompetitor = () => {
    if (!newUsername.trim()) return;
    const newComp: Competitor = {
      id: Date.now().toString(),
      username: newUsername,
      platform: newPlatform,
      followers: "--",
      avgEngagement: "--",
      postsPerWeek: 0,
      topTopics: [],
      bestTimes: [],
    };
    setCompetitors((prev) => [...prev, newComp]);
    setNewUsername("");
    setShowAddForm(false);
  };

  const removeCompetitor = (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = competitors.filter(
    (c) =>
      !searchQuery ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Account Research</h1>
            <p className="text-gray-400 text-sm">
              Analizează ce funcționează la alți creatori
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Adaugă competitor
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl bg-white/[0.03] border border-brand-500/20 p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username sau pagină..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="instagram" className="bg-gray-900">Instagram</option>
              <option value="facebook" className="bg-gray-900">Facebook</option>
              <option value="tiktok" className="bg-gray-900">TikTok</option>
              <option value="youtube" className="bg-gray-900">YouTube</option>
            </select>
            <button
              onClick={addCompetitor}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
            >
              Adaugă
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Caută competitor..."
          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
        />
      </div>

      {/* Competitor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((comp) => (
          <div
            key={comp.id}
            className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-white/[0.1] transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-white">
                  {comp.username}
                </div>
                <span
                  className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase ${platformColors[comp.platform]}`}
                >
                  {comp.platform}
                </span>
              </div>
              <div className="flex gap-1">
                <button className="p-1 text-gray-500 hover:text-white transition">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeCompetitor(comp.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Users className="w-3 h-3" /> Urmăritori
                </div>
                <div className="text-sm font-medium text-white">
                  {comp.followers}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <TrendingUp className="w-3 h-3" /> Eng. rate
                </div>
                <div className="text-sm font-medium text-white">
                  {comp.avgEngagement}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" /> /săpt.
                </div>
                <div className="text-sm font-medium text-white">
                  {comp.postsPerWeek}
                </div>
              </div>
            </div>

            {comp.topTopics.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1.5">
                  Topicuri principale
                </div>
                <div className="flex flex-wrap gap-1">
                  {comp.topTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-gray-400"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {comp.bestTimes.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1.5">
                  Cele mai bune ore
                </div>
                <div className="flex flex-wrap gap-1">
                  {comp.bestTimes.map((time) => (
                    <span
                      key={time}
                      className="px-2 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-300"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          {searchQuery
            ? "Niciun competitor găsit."
            : "Adaugă competitori pentru a le analiza strategia de conținut."}
        </div>
      )}

      <p className="text-xs text-gray-600 text-center mt-6">
        Datele sunt demo. Analiza reală va fi disponibilă după conectarea API-urilor de platformă.
      </p>
    </div>
  );
}
