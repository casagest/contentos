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
        "/dashboard",
        "/coach",
        "/compose",
        "/analyze",
        "/history",
        "/research",
        "/braindump",
        "/inspiration",
        "/settings",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
