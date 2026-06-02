import { getPostBySlug } from "@/lib/wordpress";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ArticleSchema } from "@/components/seo/ArticleSchema";
import type { Metadata } from "next";

// ─── ISR: Revalidate every hour ───────────────────────────────────────────────
export const revalidate = 3600;
export const dynamicParams = true;

// ─── Page Props ───────────────────────────────────────────────────────────────
type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

// ─── Generate metadata ────────────────────────────────────────────────────────
export async function generateMetadata(props: GuidePageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  const title = decodeTitle(post.title);

  const description = post.excerpt
    ? post.excerpt.replace(/<[^>]*>/g, "").trim().slice(0, 155)
    : post.content?.replace(/<[^>]*>/g, "").trim().slice(0, 155) || "";

  const absoluteUrl = `https://www.discountproducts.co.uk/guides/${slug}`;
  const imageUrl = post.featuredImage?.node?.sourceUrl || "/icon.svg";

  return {
    title: `${title} | Discount Quality Products`,
    description,
    alternates: {
      canonical: absoluteUrl,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl,
      type: "article",
      siteName: "Discount Quality Products",
      publishedTime: post.date,
      modifiedTime: post.modified || post.date,
      authors: [post.author?.node?.name || "Discount Products Team"],
      images: [
        {
          url: imageUrl,
          width: post.featuredImage?.node?.mediaDetails?.width || 1200,
          height: post.featuredImage?.node?.mediaDetails?.height || 630,
          alt: post.featuredImage?.node?.altText || title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip WordPress HTML entities from a title string */
function decodeTitle(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * Light server-side HTML sanitiser — no external dependencies.
 * Strips eBay links and known ad-injection patterns while preserving
 * the structural HTML produced by the WordPress block editor.
 */
function sanitisePostContent(html: string): string {
  let clean = html;

  // Remove entire <a> tags that link to eBay
  clean = clean.replace(
    /<a[^>]*href=["'][^"']*ebay\.(com|co\.uk|ie|com\.au|de|fr)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
    ""
  );

  // Remove bare eBay URLs
  clean = clean.replace(
    /https?:\/\/(www\.)?ebay\.(com|co\.uk|ie|com\.au|de|fr)[^\s"']*/gi,
    ""
  );

  // Strip common eBay marketing phrases
  const phrases = [
    /visit\s+our\s+e[Bb]ay\s+store[^<]*/gi,
    /check\s+out\s+our\s+other\s+(listings|items)[^<]*/gi,
    /powered\s+by\s+frooition[^<]*/gi,
    /frooition\.com[^<]*/gi,
  ];
  for (const p of phrases) clean = clean.replace(p, "");

  // Remove empty block-level tags
  clean = clean.replace(/<(p|div|span|li)[^>]*>\s*<\/\1>/gi, "");

  return clean;
}

/** Rough reading-time estimate (~200 wpm) */
function readingTime(html: string): number {
  const wordCount = html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

/** Format an ISO date as "2 June 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function GuidePage(props: GuidePageProps) {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const title = decodeTitle(post.title);
  const safeHtml = sanitisePostContent(post.content || "");
  const mins = readingTime(post.content || "");
  const authorName = post.author?.node?.name || "Discount Products Team";
  const category = post.categories?.nodes?.[0];
  const featuredImg = post.featuredImage?.node;

  return (
    <div className="min-h-screen bg-white">
      {/* ── JSON-LD schema ── */}
      <ArticleSchema post={post} />

      {/* ── Hero / header ── */}
      <header className="border-b border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
          <Link
            href="/guides"
            id="guide-back-link"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to guides
          </Link>

          <Breadcrumbs
            paths={[
              { label: "Guides", href: "/guides" },
              { label: title, href: `/guides/${slug}` },
            ]}
          />

          {/* Category pill */}
          {category && (
            <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-4">
              {category.name}
            </span>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl mb-5">
            {title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {authorName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {mins} min read
            </span>
          </div>
        </div>
      </header>

      {/* ── Featured image ── */}
      {featuredImg?.sourceUrl && (
        <div className="mx-auto max-w-4xl px-6 pt-8 md:px-10">
          <figure className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
            <Image
              src={featuredImg.sourceUrl}
              alt={featuredImg.altText || title}
              width={featuredImg.mediaDetails?.width || 1200}
              height={featuredImg.mediaDetails?.height || 630}
              className="w-full object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
            {featuredImg.altText && (
              <figcaption className="px-4 py-2 text-xs text-zinc-400 text-center">
                {featuredImg.altText}
              </figcaption>
            )}
          </figure>
        </div>
      )}

      {/* ── Article body ── */}
      <main id="guide-article-body" className="mx-auto max-w-4xl px-6 pb-16 pt-8 md:px-10">
        {/*
          article-body styles are declared in globals.css as .guide-content
          so they work without @tailwindcss/typography.
        */}
        <div
          className="guide-content"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

        {/* ── Author card ── */}
        <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">{authorName}</p>
            <p className="text-xs text-zinc-500">
              Published {formatDate(post.date)}
              {post.modified && post.modified !== post.date && (
                <> · Updated {formatDate(post.modified)}</>
              )}
            </p>
          </div>
        </div>

        {/* ── Back CTA ── */}
        <div className="mt-10">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            All guides
          </Link>
        </div>
      </main>
    </div>
  );
}
