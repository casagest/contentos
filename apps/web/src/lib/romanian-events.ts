/**
 * Romanian Cultural Events, Holidays & Commercial Seasons
 *
 * Pre-populated calendar data for ContentOS — the only SaaS that
 * understands the Romanian content calendar.
 *
 * Each event includes content suggestions tailored for social media.
 */

export interface RomanianEvent {
  /** Date in MM-DD format (recurring yearly) */
  date: string;
  /** Event name */
  name: string;
  /** Category for badge coloring */
  category: "national" | "cultural" | "commercial" | "international";
  /** Emoji icon */
  icon: string;
  /** Content suggestions for social media */
  contentIdeas: string[];
}

/**
 * Returns events for a specific date (MM-DD format)
 */
export function getEventsForDate(dateStr: string): RomanianEvent[] {
  const mmdd = dateStr.slice(5); // "2026-03-01" → "03-01"
  return ROMANIAN_EVENTS.filter((e) => e.date === mmdd);
}

/**
 * Returns all events for a given month (1-indexed)
 */
export function getEventsForMonth(month: number): RomanianEvent[] {
  const mm = String(month).padStart(2, "0");
  return ROMANIAN_EVENTS.filter((e) => e.date.startsWith(mm));
}

export const ROMANIAN_EVENTS: RomanianEvent[] = [
  // ─── Ianuarie ─────────────────────────────────────────────────
  {
    date: "01-01",
    name: "Anul Nou",
    category: "national",
    icon: "🎆",
    contentIdeas: [
      "Retrospectivă anul trecut + obiective anul nou",
      "Mesaj de Anul Nou pentru comunitate",
      "Top 3 lecții învățate anul trecut",
    ],
  },
  {
    date: "01-24",
    name: "Ziua Unirii Principatelor",
    category: "national",
    icon: "🇷🇴",
    contentIdeas: [
      "Post patriotic cu context istoric",
      "Cum se leagă brandul tău de valorile românești",
      "Story/Reel cu Hora Unirii remix modern",
    ],
  },

  // ─── Februarie ────────────────────────────────────────────────
  {
    date: "02-14",
    name: "Valentine's Day",
    category: "international",
    icon: "❤️",
    contentIdeas: [
      "Promoție specială de Valentine's Day",
      "Love story al brandului tău",
      "User-generated content cu cupluri",
    ],
  },
  {
    date: "02-24",
    name: "Dragobete",
    category: "cultural",
    icon: "💕",
    contentIdeas: [
      "Tradiții românești de Dragobete",
      "Promoție românească de ziua iubirii",
      "Postare 'Dragobete vs Valentine's Day'",
    ],
  },

  // ─── Martie ───────────────────────────────────────────────────
  {
    date: "03-01",
    name: "Mărțișor",
    category: "cultural",
    icon: "🌸",
    contentIdeas: [
      "Postare cu tradiția mărțișorului",
      "Ofertă specială de 1 Martie",
      "Behind-the-scenes: echipa ta oferind mărțișoare",
    ],
  },
  {
    date: "03-08",
    name: "Ziua Femeii",
    category: "international",
    icon: "💐",
    contentIdeas: [
      "Spotlight pe femeile din echipă",
      "Promoție dedicată femeilor",
      "Mesaj de apreciere pentru comunitate",
    ],
  },

  // ─── Aprilie ──────────────────────────────────────────────────
  {
    date: "04-20",
    name: "Paște Ortodox (aprox.)",
    category: "national",
    icon: "🐣",
    contentIdeas: [
      "Mesaj de Paște Fericit",
      "Tradiții de Paște românești",
      "Reel: pregătiri de Paște la birou/atelier",
    ],
  },

  // ─── Mai ──────────────────────────────────────────────────────
  {
    date: "05-01",
    name: "Ziua Muncii",
    category: "national",
    icon: "🌿",
    contentIdeas: [
      "Gratar & relaxare — conținut casual",
      "Apreciere pentru echipă",
      "Promoție de 1 Mai",
    ],
  },
  {
    date: "05-10",
    name: "Sâmbra Oilor (aprox.)",
    category: "cultural",
    icon: "🐑",
    contentIdeas: [
      "Tradiții pastorale românești",
      "Content despre autenticitate și tradiție",
      "Legătura brand-tradiție",
    ],
  },

  // ─── Iunie ─────────────────────────────────────────────────────
  {
    date: "06-01",
    name: "Ziua Copilului",
    category: "national",
    icon: "🧸",
    contentIdeas: [
      "Promoție de Ziua Copilului",
      "Throwback la copilăria echipei",
      "Cauză socială — donații sau implicare",
    ],
  },
  {
    date: "06-26",
    name: "Ziua Tricolorului",
    category: "national",
    icon: "🇷🇴",
    contentIdeas: [
      "Post cu tricolorul și istoria drapelului",
      "Produse/servicii made in Romania",
    ],
  },

  // ─── Iulie ────────────────────────────────────────────────────
  {
    date: "07-27",
    name: "Untold Festival (aprox.)",
    category: "cultural",
    icon: "🎶",
    contentIdeas: [
      "Content legat de festivaluri",
      "Playlist branded pe tema festivalului",
      "UGC de la festival",
    ],
  },

  // ─── August ───────────────────────────────────────────────────
  {
    date: "08-15",
    name: "Sfânta Maria / Ziua Marinei",
    category: "national",
    icon: "⚓",
    contentIdeas: [
      "La mulți ani celor cu numele Maria/Marian",
      "Content estival, vacanță, mare",
      "Promoție de vară",
    ],
  },
  {
    date: "08-28",
    name: "George Enescu Festival (aprox.)",
    category: "cultural",
    icon: "🎻",
    contentIdeas: [
      "Cultură și eleganță în content",
      "Parteneriate culturale",
      "Reels cu muzică clasică",
    ],
  },

  // ─── Septembrie ───────────────────────────────────────────────
  {
    date: "09-15",
    name: "Începerea Școlii (aprox.)",
    category: "commercial",
    icon: "📚",
    contentIdeas: [
      "Back to school promoții",
      "Tips productivitate pentru toamnă",
      "Nou sezon = nou start — CTA engagement",
    ],
  },

  // ─── Octombrie ────────────────────────────────────────────────
  {
    date: "10-31",
    name: "Halloween",
    category: "international",
    icon: "🎃",
    contentIdeas: [
      "Content tematic Halloween",
      "Behind-the-scenes costumații echipă",
      "Promoție 'spooky deals'",
    ],
  },

  // ─── Noiembrie ────────────────────────────────────────────────
  {
    date: "11-15",
    name: "Black Friday România (aprox.)",
    category: "commercial",
    icon: "🏷️",
    contentIdeas: [
      "Teasing campanie Black Friday — 2 săptămâni înainte",
      "Countdown Stories zilnice",
      "Early access pentru followeri fideli",
    ],
  },
  {
    date: "11-30",
    name: "Sfântul Andrei",
    category: "cultural",
    icon: "🧄",
    contentIdeas: [
      "Tradiții de Sfântul Andrei",
      "Noaptea de Sf. Andrei — content mistic",
      "La mulți ani Andrei & Andreea",
    ],
  },

  // ─── Decembrie ────────────────────────────────────────────────
  {
    date: "12-01",
    name: "Ziua Națională a României",
    category: "national",
    icon: "🇷🇴",
    contentIdeas: [
      "Post patriotic Ziua Națională",
      "Made in Romania — spotlight produse locale",
      "Reel cu parade/evenimente locale",
    ],
  },
  {
    date: "12-06",
    name: "Sfântul Nicolae / Moș Nicolae",
    category: "cultural",
    icon: "🎅",
    contentIdeas: [
      "Promoție de Moș Nicolae (ghetuțe)",
      "Giveaway tematic",
      "Mesaj pentru comunitate",
    ],
  },
  {
    date: "12-24",
    name: "Ajunul Crăciunului",
    category: "national",
    icon: "🎄",
    contentIdeas: [
      "Mesaj de Crăciun Fericit",
      "Retrospectiva anului",
      "Countdown final de vânzări",
    ],
  },
  {
    date: "12-25",
    name: "Crăciun",
    category: "national",
    icon: "🎁",
    contentIdeas: [
      "Post festiv cu echipa",
      "User-generated content de Crăciun",
      "Mesaj cald pentru comunitate",
    ],
  },
  {
    date: "12-31",
    name: "Revelion",
    category: "national",
    icon: "🥂",
    contentIdeas: [
      "Retrospectiva completă a anului",
      "Top momente ale brandului",
      "Countdown spre Anul Nou",
    ],
  },
];
