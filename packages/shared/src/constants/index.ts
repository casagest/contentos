export const PLANS = {
  free: { name: "Free", priceEur: 0, platforms: 1, postsPerMonth: 50 },
  starter: { name: "Starter", priceEur: 19, platforms: 2, postsPerMonth: -1 },
  pro: { name: "Pro", priceEur: 49, platforms: 5, postsPerMonth: -1 },
  agency: { name: "Agency", priceEur: 99, platforms: 5, postsPerMonth: -1 },
  dental: { name: "Dental", priceEur: 79, platforms: 5, postsPerMonth: -1 },
} as const;

export const PLATFORM_COLORS = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
} as const;

export const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
} as const;
