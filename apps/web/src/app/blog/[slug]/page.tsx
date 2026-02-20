import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-surface-ground">
      <article className="pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 mb-8 text-sm text-gray-400 hover:text-white transition"
          >
            ← Toate articolele
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold">
                {post.category}
              </span>
              <span className="text-xs text-gray-500">{post.readTime}</span>
              <span className="text-xs text-gray-500">
                {new Date(post.date).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              {post.description}
            </p>
          </div>

          {/* Content — rendered as simple markdown-like sections */}
          <div className="prose prose-invert prose-orange max-w-none">
            {post.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="text-2xl font-bold text-white mt-10 mb-4 tracking-tight"
                  >
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              if (block.startsWith("### ")) {
                return (
                  <h3
                    key={i}
                    className="text-lg font-bold text-white mt-6 mb-3"
                  >
                    {block.replace("### ", "")}
                  </h3>
                );
              }
              if (block.startsWith("- ") || block.startsWith("* ")) {
                return (
                  <ul key={i} className="list-disc list-inside space-y-1 text-gray-300 text-sm leading-relaxed mb-4">
                    {block.split("\n").map((line, j) => (
                      <li key={j}>{line.replace(/^[-*] /, "")}</li>
                    ))}
                  </ul>
                );
              }
              if (block.startsWith("|")) {
                const rows = block.split("\n").filter((r) => !r.startsWith("|---"));
                const headers = rows[0]?.split("|").filter(Boolean).map((h) => h.trim()) ?? [];
                const data = rows.slice(1);
                return (
                  <div key={i} className="overflow-x-auto mb-4">
                    <table className="w-full text-sm text-gray-300 border border-white/10 rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-white/5">
                          {headers.map((h, hi) => (
                            <th key={hi} className="px-4 py-2 text-left font-semibold text-white">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, ri) => (
                          <tr key={ri} className="border-t border-white/5">
                            {row.split("|").filter(Boolean).map((cell, ci) => (
                              <td key={ci} className="px-4 py-2">{cell.trim()}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (block.startsWith("1. ") || /^\d+\.\s/.test(block)) {
                return (
                  <ol key={i} className="list-decimal list-inside space-y-1 text-gray-300 text-sm leading-relaxed mb-4">
                    {block.split("\n").map((line, j) => (
                      <li key={j}>{line.replace(/^\d+\.\s/, "")}</li>
                    ))}
                  </ol>
                );
              }
              if (block.startsWith("---")) {
                return <hr key={i} className="border-white/10 my-8" />;
              }
              // Regular paragraph — handle inline markdown
              return (
                <p
                  key={i}
                  className="text-gray-300 text-sm leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{
                    __html: block
                      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-orange-400 hover:text-orange-300 underline">$1</a>')
                      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/5 text-orange-300 text-xs font-mono">$1</code>'),
                  }}
                />
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">
              Gata să creezi conținut mai bun?
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              ContentOS generează postări optimizate per platformă, cu scor AI înainte de publicare.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold transition-all shadow-lg shadow-orange-500/25"
            >
              Începe Gratuit 7 Zile
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
