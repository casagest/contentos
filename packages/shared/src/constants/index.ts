export const PLANS = {
  free: { name: "Free Trial", priceRon: 0, platforms: 5, postsPerMonth: -1, trialDays: 7 },
  starter: { name: "Starter", priceRon: 99, platforms: 2, postsPerMonth: -1, trialDays: 0 },
  pro: { name: "Pro", priceRon: 249, platforms: 5, postsPerMonth: -1, trialDays: 0 },
  agency: { name: "Agency", priceRon: 499, platforms: 5, postsPerMonth: -1, trialDays: 0 },
  dental: { name: "Dental", priceRon: 399, platforms: 5, postsPerMonth: -1, trialDays: 0 },
} as const;

export const PLATFORM_COLORS = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
} as const;

export const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
} as const;
