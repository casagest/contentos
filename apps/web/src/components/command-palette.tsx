"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Brain,
  PenTool,
  Sparkles,
  BarChart3,
  Search,
  Lightbulb,
  Video,
  ImageIcon,
  TrendingUp,
  CalendarDays,
  Clock,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  keywords?: string[];
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const items: CommandItem[] = [
    { id: "braindump", label: "Creier Idei", icon: <Brain className="w-4 h-4" />, href: "/braindump", keywords: ["idei", "generare", "brainstorm"], group: "Creează" },
    { id: "compose", label: "Compune Conținut", icon: <PenTool className="w-4 h-4" />, href: "/compose", keywords: ["scrie", "postare", "text"], group: "Creează" },
    { id: "coach", label: "Antrenor AI", icon: <Sparkles className="w-4 h-4" />, href: "/coach", keywords: ["sfaturi", "recomandări", "îmbunătățire"], group: "Instrumente AI" },
    { id: "analyze", label: "Scorant", icon: <BarChart3 className="w-4 h-4" />, href: "/analyze", keywords: ["scor", "algoritm", "evaluare"], group: "Instrumente AI" },
    { id: "research", label: "Cercetare Conturi", icon: <Search className="w-4 h-4" />, href: "/research", keywords: ["analiză", "competitori", "conturi"], group: "Instrumente AI" },
    { id: "inspiration", label: "Inspirație", icon: <Lightbulb className="w-4 h-4" />, href: "/inspiration", keywords: ["idei", "trending", "viral"], group: "Instrumente AI" },
    { id: "video-script", label: "Script Video", icon: <Video className="w-4 h-4" />, href: "/video-script", keywords: ["tiktok", "reels", "video", "script"], group: "Media" },
    { id: "image-editor", label: "Editor Imagine", icon: <ImageIcon className="w-4 h-4" />, href: "/image-editor", keywords: ["imagine", "text", "overlay"], group: "Media" },
    { id: "analytics", label: "Analiză Performanță", icon: <TrendingUp className="w-4 h-4" />, href: "/analytics", keywords: ["statistici", "engagement", "metrici"], group: "Monitorizare" },
    { id: "calendar", label: "Calendar Conținut", icon: <CalendarDays className="w-4 h-4" />, href: "/calendar", keywords: ["programare", "planificare"], group: "Monitorizare" },
    { id: "history", label: "Istoric Postări", icon: <Clock className="w-4 h-4" />, href: "/history", keywords: ["postări", "publicate", "istoric"], group: "Monitorizare" },
    { id: "settings", label: "Setări", icon: <Settings className="w-4 h-4" />, href: "/settings", keywords: ["profil", "configurare", "plan"], group: "Cont" },
    { id: "signout", label: "Deconectare", icon: <LogOut className="w-4 h-4" />, action: handleSignOut, keywords: ["iesire"], group: "Cont" },
  ];

  // Keyboard shortcut: Ctrl+K / ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runCommand = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [router],
  );

  const groups = [...new Set(items.map((i) => i.group))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <Command
          label="Paletă de comenzi"
          className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Caută pagini și acțiuni..."
              className="w-full py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono border border-border">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              Niciun rezultat găsit.
            </Command.Empty>

            {groups.map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items
                  .filter((i) => i.group === group)
                  .map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.label}
                      keywords={item.keywords}
                      onSelect={() => runCommand(item)}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-foreground/80 cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-white transition-colors"
                    >
                      <span className="text-muted-foreground">{item.icon}</span>
                      {item.label}
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">Navigare rapidă</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono border border-border">↑↓</kbd>
              <span className="text-[10px] text-muted-foreground">navighează</span>
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono border border-border ml-2">↵</kbd>
              <span className="text-[10px] text-muted-foreground">selectează</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
