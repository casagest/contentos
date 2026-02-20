import { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro").trim();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/register",
        "/reset-password",
        "/update-password",
        "/onboarding",
        "/dashboard",
        "/coach",
        "/compose",
        "/analyze",
        "/analytics",
        "/history",
        "/research",
        "/braindump",
        "/inspiration",
        "/settings",
        "/trends",
        "/video-script",
        "/image-editor",
        "/calendar",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
