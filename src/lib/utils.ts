import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  pound: '£',
  euro: '€',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  times: '×',
};

function decodeHtmlEntitiesOnce(str: string): string {
  return str.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      if (Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }
    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      if (Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }
    const named = NAMED_HTML_ENTITIES[entity.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let decoded = str;
  // Run up to 2 passes to handle double-escaped WordPress/eBay entities (e.g. &amp;#8217;)
  for (let pass = 0; pass < 2; pass++) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

/**
 * Sanitises a search query for WordPress GraphQL and WooCommerce REST API.
 *
 * - Strips special characters (&, brackets, etc.) that confuse MySQL fulltext
 * - Collapses whitespace
 * - Truncates to a maximum word count (default 10) to prevent query-length failures
 *
 * The returned string is safe to pass directly to backend search APIs.
 */
export function sanitiseSearchQuery(query: string, maxWords: number = 10): string {
  if (!query) return '';

  const sanitised = query
    .replace(/&/g, ' ')          // & confuses MySQL MATCH … AGAINST
    .replace(/[()[\]{}<>]/g, '') // remove brackets / parentheses
    .replace(/[^\w\s.,'/-]/g, ' ') // strip remaining special chars
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();

  // Truncate to maxWords
  const words = sanitised.split(' ');
  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(' ');
  }

  return sanitised;
}
