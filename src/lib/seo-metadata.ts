import { decodeHtmlEntities } from "./utils";

/**
 * Extracts a clean plain-text meta description excerpt from WooCommerce/eBay HTML.
 * Strips <style>/<script> blocks first so inline CSS rules never leak into search snippets.
 */
export function stripHtmlToExcerpt(html: string | undefined, maxLength: number = 155): string {
  if (!html) return "";

  const withoutBlocks = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();

  if (decoded.length <= maxLength) {
    return decoded;
  }

  const sliced = decoded.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cleanCut = lastSpace >= Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return `${cleanCut.trimEnd()}…`;
}

/**
 * Converts a hyphenated URL slug into a readable title-cased fallback label.
 */
export function formatSlugFallbackTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}
