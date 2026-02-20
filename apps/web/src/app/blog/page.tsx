import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog — Ghiduri Content Marketing România",
  description:
    "Strategii de social media marketing, algoritmi, tips și ghiduri pentru creatori și business-uri din România.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-surface-ground">
      {/* Header */}
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 text-sm text-gray-400 hover:text-white transition">
            ← Înapoi la ContentOS
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Blog Content<span className="text-orange-400">OS</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Ghiduri, strategii și tips de content marketing pentru piața românească.
          </p>
        </div>
      </div>

      {/* Posts grid */}
      <div className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid gap-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold">
                  {post.category}
                </span>
                <span className="text-xs text-gray-500">{post.readTime}</span>
                <span className="text-xs text-gray-500">{new Date(post.date).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
                {post.title}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
