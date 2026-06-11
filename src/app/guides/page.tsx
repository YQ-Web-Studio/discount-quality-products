import { getPosts } from "@/lib/wordpress";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 2592000;

export const metadata: Metadata = {
  title: "Buying Guides & Tips | Discount Quality Products",
  description:
    "Expert guides on light bulbs, screws, electrical fittings, and more. Practical buying advice for UK trade and DIY customers from Discount Quality Products.",
  alternates: {
    canonical: "https://www.discountproducts.co.uk/guides",
  },
  openGraph: {
    title: "Buying Guides & Tips | Discount Quality Products",
    description:
      "Expert guides on light bulbs, screws, electrical fittings, and more. Practical buying advice for UK trade and DIY customers.",
    url: "https://www.discountproducts.co.uk/guides",
    type: "website",
    siteName: "Discount Quality Products",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "Discount Quality Products" }],
  },
};

/** Format an ISO date as "12 June 2025" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Strip HTML entities and tags from a title */
function decodeTitle(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/** Extract plain-text excerpt from WP HTML */
function plainExcerpt(html: string, max = 130): string {
  return html.replace(/<[^>]*>/g, "").trim().slice(0, max).trimEnd() + "…";
}

export default async function GuidesIndexPage() {
  const { posts } = await getPosts(24);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ── */}
      <header className="border-b border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
              <BookOpen className="h-4.5 w-4.5 text-emerald-700" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
              Trade Hub
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">
            Buying Guides &amp; Tips
          </h1>
          <p className="max-w-xl text-base text-zinc-500 leading-relaxed">
            Practical advice on light bulbs, electrical fittings, fixings, collectibles and more
            — written for UK trade and DIY customers.
          </p>
        </div>
      </header>

      {/* ── Article grid ── */}
      <main
        id="guides-article-grid"
        className="mx-auto max-w-6xl px-6 py-12 md:px-10"
      >
        {posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-zinc-400 text-base">No guides published yet — check back soon.</p>
          </div>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const title = decodeTitle(post.title);
              const excerpt = post.excerpt
                ? plainExcerpt(post.excerpt)
                : plainExcerpt(post.content || "");
              const featuredImg = post.featuredImage?.node;
              const category = post.categories?.nodes?.[0];

              return (
                <li key={post.id}>
                  <Link
                    href={`/guides/${post.slug}`}
                    id={`guide-card-${post.slug}`}
                    className="group flex flex-col h-full rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-zinc-100 overflow-hidden">
                      {featuredImg?.sourceUrl ? (
                        <Image
                          src={featuredImg.sourceUrl}
                          alt={featuredImg.altText || title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-emerald-50">
                          <BookOpen className="h-10 w-10 text-emerald-200" />
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      {category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                          {category.name}
                        </span>
                      )}
                      <h2 className="text-base font-semibold leading-snug text-zinc-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {title}
                      </h2>
                      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3 flex-1">
                        {excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-50">
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.date)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          Read more
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
