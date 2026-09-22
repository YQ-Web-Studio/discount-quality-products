import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
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
