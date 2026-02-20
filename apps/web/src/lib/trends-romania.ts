/**
 * Trend Radar România — What's trending NOW for Romanian content creators.
 *
 * Combines:
 * 1. Romanian cultural calendar (today/this week/upcoming)
 * 2. Seasonal content angles (based on month/day-of-week)
 * 3. Platform-specific trending formats
 * 4. Industry-specific hooks
 *
 * Zero external API calls — all computed locally from embedded knowledge.
 * This is the ONLY tool in Romania that offers this.
 */

import { ROMANIAN_EVENTS, type RomanianEvent } from "./romanian-events";

/* ─── Types ─── */

export interface TrendItem {
  id: string;
  title: string;
  description: string;
  category: "event" | "seasonal" | "format" | "hook" | "timing";
  relevance: number; // 0-100
  icon: string;
  platforms: string[];
  contentAngle: string;
  /** One-click prompt for braindump */
  quickPrompt: string;
  expiresIn?: string;
}

export interface TrendRadarResult {
  date: string;
  dayOfWeek: string;
  todayEvents: TrendItem[];
  thisWeek: TrendItem[];
  upcomingEvents: TrendItem[];
  seasonalTrends: TrendItem[];
  platformFormats: TrendItem[];
  timingInsights: TrendItem[];
}

/* ─── Day of Week (Romanian) ─── */

const DAYS_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

/* ─── Seasonal Content Themes ─── */

const SEASONAL_THEMES: Record<number, { theme: string; angles: string[]; icon: string }> = {
  1: {
    theme: "Fresh Start & Planificare",
    angles: [
      "Obiective SMART pentru social media în 2026",
      "Ce am învățat anul trecut (behind the scenes)",
      "Detox digital — de ce e bine și pentru audiență",
    ],
    icon: "🎯",
  },
  2: {
    theme: "Autenticitate & Dragoste",
    angles: [
      "Povestea ta de brand — de ce faci ce faci",
      "Valentine's Day / Dragobete — conținut emoțional",
      "Behind the scenes — procesul tău creativ",
    ],
    icon: "💝",
  },
  3: {
    theme: "Primăvară & Reînnoire",
    angles: [
      "Spring cleaning — reorganizare content strategy",
      "Mărțișor — tradiție + brand story",
      "Lansare produs/serviciu nou (sezon perfect)",
    ],
    icon: "🌸",
  },
  4: {
    theme: "Creștere & Educație",
    angles: [
      "Tutorial/how-to series (engagement peak în Q2)",
      "Earth Day — sustenabilitate și brand values",
      "Q1 review — ce a funcționat, ce schimbi",
    ],
    icon: "📈",
  },
  5: {
    theme: "Comunitate & Outdoor",
    angles: [
      "User generated content campaign",
      "Content outdoor/lifestyle (lumina naturală = mai bun reach)",
      "Colaborări locale — micro-influenceri din orașul tău",
    ],
    icon: "☀️",
  },
  6: {
    theme: "Energie & Vară",
    angles: [
      "Summer vibes — conținut ușor, video scurt",
      "Q2 results — transparență cu comunitatea",
      "Behind the scenes vacanță (umanizare brand)",
    ],
    icon: "🏖️",
  },
  7: {
    theme: "Relaxare & Storytelling",
    angles: [
      "Mini-serie de povești (serialized content)",
      "Day in my life — conținut autentic de vară",
      "Anticipare back-to-school (pregătire din iulie)",
    ],
    icon: "📖",
  },
  8: {
    theme: "Pregătire & Strategie Q4",
    angles: [
      "Back to school — conținut educațional",
      "Planificare Q4 (cel mai profitabil quarter)",
      "Rebranding subtil — actualizare identitate vizuală",
    ],
    icon: "📋",
  },
  9: {
    theme: "Back to Business",
    angles: [
      "Lansare campanie de toamnă",
      "Educational content series (audiența e receptivă)",
      "Podcast/long-form — sezonul ideal",
    ],
    icon: "🍂",
  },
  10: {
    theme: "Pre-Holiday & Awareness",
    angles: [
      "Halloween — conținut creativ/fun",
      "Pregătire Black Friday (teasing)",
      "Awareness campaigns (Octombrie Roz etc.)",
    ],
    icon: "🎃",
  },
  11: {
    theme: "Black Friday & Gratitudine",
    angles: [
      "Black Friday — oferte, countdown, urgency",
      "Gratitudine — mulțumire comunității (engagement organic)",
      "Year in review — pregătire retrospectivă",
    ],
    icon: "🛍️",
  },
  12: {
    theme: "Sărbători & Retrospectivă",
    angles: [
      "Advent calendar content (30 zile de postări)",
      "Gift guides cu produsele/serviciile tale",
      "Retrospectiva anului — top momente",
    ],
    icon: "🎄",
  },
};

/* ─── Platform-Specific Format Trends ─── */

interface FormatTrend {
  platform: string;
  format: string;
  description: string;
  icon: string;
  relevance: number;
}

const PLATFORM_FORMATS: FormatTrend[] = [
  { platform: "instagram", format: "Carousel educațional 5-7 slides", description: "Cele mai salvate — ideal pentru tips & tricks. Slide 1 = hook puternic, ultimul = CTA.", icon: "📚", relevance: 95 },
  { platform: "instagram", format: "Reel behind-the-scenes", description: "Algoritm boost 2x reach vs foto. Arată procesul, nu doar rezultatul.", icon: "🎬", relevance: 90 },
  { platform: "instagram", format: "Story poll/quiz interactiv", description: "Crește engagement rate → semnalizează algoritmul. 2-3 stories/zi = optim.", icon: "📊", relevance: 85 },
  { platform: "tiktok", format: "Hook în primele 2 secunde", description: "Retenția la 3s decide dacă video-ul se viralizează. Text on screen obligatoriu.", icon: "⚡", relevance: 95 },
  { platform: "tiktok", format: "Stitch/Duet cu trending", description: "Surfează pe valul altui creator. Adaugă perspectiva ta unică.", icon: "🔗", relevance: 85 },
  { platform: "tiktok", format: "POV storytelling", description: "Cel mai engaging format pe TikTok RO acum. Povești personale = gold.", icon: "👤", relevance: 88 },
  { platform: "facebook", format: "Post lung (500+ cuvinte) cu hook", description: "Facebook favorizează time-on-post. Hook emoțional + story = cel mai bun reach organic.", icon: "📝", relevance: 85 },
  { platform: "facebook", format: "Video nativ sub 3 min", description: "Video nativ bate link YouTube de 5x pe reach. Upload direct.", icon: "🎥", relevance: 80 },
  { platform: "linkedin", format: "Post personal cu lecție profesională", description: "LinkedIn RO adoră vulnerabilitate profesională. Erori + lecții > succese.", icon: "💼", relevance: 90 },
  { platform: "linkedin", format: "Document PDF carousel", description: "Cele mai virale pe LinkedIn RO. Tips, framework-uri, checklists.", icon: "📄", relevance: 88 },
];

/* ─── Day-of-Week Posting Insights ─── */

interface TimingInsight {
  dayOfWeek: number; // 0=Sunday
  insight: string;
  bestPlatform: string;
  bestTime: string;
  icon: string;
}

const TIMING_INSIGHTS: TimingInsight[] = [
  { dayOfWeek: 0, insight: "Duminică: conținut relaxat, storytelling, recap săptămânal", bestPlatform: "Instagram Stories", bestTime: "10:00-12:00", icon: "☕" },
  { dayOfWeek: 1, insight: "Luni: motivație, obiective, start de săptămână — audiența e receptivă", bestPlatform: "LinkedIn", bestTime: "08:00-09:00", icon: "🚀" },
  { dayOfWeek: 2, insight: "Marți: cel mai bun engagement pe Instagram RO — postează tutorial/carousel", bestPlatform: "Instagram", bestTime: "18:00-20:00", icon: "🔥" },
  { dayOfWeek: 3, insight: "Miercuri: mid-week slump — conținut ușor, behind the scenes, polls", bestPlatform: "Instagram Stories", bestTime: "12:00-14:00", icon: "💡" },
  { dayOfWeek: 4, insight: "Joi: conținut educațional performează cel mai bine azi", bestPlatform: "TikTok", bestTime: "19:00-21:00", icon: "📖" },
  { dayOfWeek: 5, insight: "Vineri: conținut fun/entertainment — audiența vrea să se relaxeze", bestPlatform: "TikTok & Reels", bestTime: "17:00-19:00", icon: "🎉" },
  { dayOfWeek: 6, insight: "Sâmbătă: engagement scăzut dar salvări mari — postează evergreen content", bestPlatform: "Instagram Carousel", bestTime: "10:00-11:00", icon: "📌" },
];

/* ─── Universal Hooks (Romanian) ─── */

const POWER_HOOKS_RO: { hook: string; type: string; avgEngagement: string }[] = [
  { hook: "Știai că...?", type: "curiosity", avgEngagement: "+45% reach" },
  { hook: "Greșeala #1 pe care o faci când...", type: "pain-point", avgEngagement: "+38% saves" },
  { hook: "Am încercat X timp de Y zile. Uite ce s-a întâmplat.", type: "experiment", avgEngagement: "+52% engagement" },
  { hook: "Nu mai face asta pe [platformă]!", type: "negative-hook", avgEngagement: "+41% clicks" },
  { hook: "3 lucruri pe care le-am învățat după...", type: "listicle", avgEngagement: "+35% shares" },
  { hook: "Nimeni nu vorbește despre asta, dar...", type: "insider", avgEngagement: "+48% comments" },
  { hook: "Cum am ajuns de la X la Y în Z luni", type: "transformation", avgEngagement: "+55% saves" },
  { hook: "Salvează asta pentru când ai nevoie", type: "save-bait", avgEngagement: "+62% saves" },
  { hook: "Dacă faci [nișă], trebuie să știi asta", type: "authority", avgEngagement: "+33% follows" },
  { hook: "Unpopular opinion: ...", type: "contrarian", avgEngagement: "+71% comments" },
];

/* ─── Main Function ─── */

export function getTrendRadar(date: Date = new Date()): TrendRadarResult {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split("T")[0];

  // 1. Today's events
  const todayRomanianEvents = ROMANIAN_EVENTS.filter((e) => e.date === mmdd);
  const todayEvents = todayRomanianEvents.map((ev) => eventToTrend(ev, "today"));

  // 2. This week (next 7 days)
  const thisWeek: TrendItem[] = [];
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(date);
    futureDate.setDate(futureDate.getDate() + i);
    const futureMmdd = `${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;
    const events = ROMANIAN_EVENTS.filter((e) => e.date === futureMmdd);
    for (const ev of events) {
      thisWeek.push(eventToTrend(ev, `în ${i} ${i === 1 ? "zi" : "zile"}`));
    }
  }

  // 3. Upcoming (next 30 days, excluding this week)
  const upcomingEvents: TrendItem[] = [];
  for (let i = 8; i <= 30; i++) {
    const futureDate = new Date(date);
    futureDate.setDate(futureDate.getDate() + i);
    const futureMmdd = `${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;
    const events = ROMANIAN_EVENTS.filter((e) => e.date === futureMmdd);
    for (const ev of events) {
      upcomingEvents.push(eventToTrend(ev, `în ${i} zile`));
    }
  }

  // 4. Seasonal trends
  const seasonal = SEASONAL_THEMES[month] || SEASONAL_THEMES[1];
  const seasonalTrends: TrendItem[] = seasonal.angles.map((angle, i) => ({
    id: `seasonal-${month}-${i}`,
    title: angle,
    description: `Tema lunii ${MONTHS_RO[month - 1]}: ${seasonal.theme}`,
    category: "seasonal" as const,
    relevance: 70 - i * 5,
    icon: seasonal.icon,
    platforms: ["instagram", "facebook", "tiktok", "linkedin"],
    contentAngle: angle,
    quickPrompt: `Scrie un post despre: ${angle}. Luna ${MONTHS_RO[month - 1]}, tema: ${seasonal.theme}.`,
  }));

  // 5. Platform format trends
  const platformFormats: TrendItem[] = PLATFORM_FORMATS.map((f, i) => ({
    id: `format-${f.platform}-${i}`,
    title: f.format,
    description: f.description,
    category: "format" as const,
    relevance: f.relevance,
    icon: f.icon,
    platforms: [f.platform],
    contentAngle: f.format,
    quickPrompt: `Creează conținut în formatul: ${f.format}. ${f.description}`,
  }));

  // 6. Timing insights for today
  const todayTiming = TIMING_INSIGHTS.find((t) => t.dayOfWeek === dayOfWeek);
  const timingInsights: TrendItem[] = todayTiming
    ? [
        {
          id: `timing-${dayOfWeek}`,
          title: todayTiming.insight,
          description: `Platformă optimă: ${todayTiming.bestPlatform} la ${todayTiming.bestTime}`,
          category: "timing" as const,
          relevance: 80,
          icon: todayTiming.icon,
          platforms: [todayTiming.bestPlatform.toLowerCase().split(" ")[0]],
          contentAngle: todayTiming.insight,
          quickPrompt: `E ${DAYS_RO[dayOfWeek]}. ${todayTiming.insight}. Creează un post optimizat pentru ${todayTiming.bestPlatform}.`,
        },
        // Add a random hook suggestion
        ...getRandomHooks(2, dayOfWeek),
      ]
    : getRandomHooks(2, dayOfWeek);

  return {
    date: dateStr,
    dayOfWeek: DAYS_RO[dayOfWeek],
    todayEvents,
    thisWeek,
    upcomingEvents,
    seasonalTrends,
    platformFormats,
    timingInsights,
  };
}

/* ─── Helpers ─── */

function eventToTrend(ev: RomanianEvent, expiresIn: string): TrendItem {
  return {
    id: `event-${ev.date}-${ev.name.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${ev.icon} ${ev.name}`,
    description: ev.contentIdeas[0] || `Conținut pentru ${ev.name}`,
    category: "event" as const,
    relevance: expiresIn === "today" ? 100 : 85,
    icon: ev.icon,
    platforms: ["instagram", "facebook", "tiktok"],
    contentAngle: ev.contentIdeas.join(" | "),
    quickPrompt: `Azi e ${ev.name} (${ev.icon}). Creează un post pentru social media. Idei: ${ev.contentIdeas.join("; ")}`,
    expiresIn,
  };
}

function getRandomHooks(count: number, seed: number): TrendItem[] {
  // Deterministic "random" based on day-of-week to avoid hydration mismatch
  const startIdx = (seed * 3) % POWER_HOOKS_RO.length;
  const hooks: TrendItem[] = [];
  for (let i = 0; i < count; i++) {
    const hook = POWER_HOOKS_RO[(startIdx + i) % POWER_HOOKS_RO.length];
    hooks.push({
      id: `hook-${i}-${hook.type}`,
      title: `Hook: "${hook.hook}"`,
      description: `${hook.avgEngagement} — Tip: ${hook.type}`,
      category: "hook" as const,
      relevance: 75,
      icon: "🎣",
      platforms: ["instagram", "facebook", "tiktok", "linkedin"],
      contentAngle: `Folosește hook-ul "${hook.hook}" într-un post.`,
      quickPrompt: `Scrie un post social media care începe cu hook-ul: "${hook.hook}". Fă-l captivant și autentic.`,
    });
  }
  return hooks;
}

/**
 * Get the top N most relevant trends right now.
 */
export function getTopTrends(date: Date = new Date(), limit: number = 5): TrendItem[] {
  const radar = getTrendRadar(date);
  const all = [
    ...radar.todayEvents,
    ...radar.thisWeek.slice(0, 3),
    ...radar.timingInsights,
    ...radar.seasonalTrends.slice(0, 2),
  ];
  return all.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
}
