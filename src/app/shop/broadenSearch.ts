/**
 * Helper to auto-broaden search queries when zero exact matches are found.
 * Strips specifications, packaging noise, and stop words to extract core searchable terms.
 */

const STOP_AND_NOISE_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "for", "with", "by", "of", "to", "or", "from",
  "pack", "pk", "box", "case", "bag", "set", "rare", "super", "best", "genuine", "original",
  "piece", "pieces", "pcs", "new", "used", "vintage"
]);

const SPEC_PATTERNS = [
  /\b\d+\s*(?:w|v|watt|watts|volt|volts|amp|amps|ah|mah|hz|khz|mhz|mm|cm|m)\b/gi,
  /\b\d+\s*(?:pack|pk|pcs|pieces?|way|gang|core|pin)\b/gi,
  /\b\d+[-/](?:way|gang|core|pin|pack)\b/gi,
  /\b\d+\b/g, // standalone numbers
  /[^\w\s]/g, // punctuation
];

export function broadenSearchQuery(query: string): string | null {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return null;

  let cleaned = trimmed;
  for (const pattern of SPEC_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const significantTokens = rawTokens.filter((token) => !STOP_AND_NOISE_WORDS.has(token) && token.length > 2);

  if (significantTokens.length === 0) {
    return null;
  }

  // Pick up to the first 3 significant tokens
  const broadened = significantTokens.slice(0, 3).join(" ").trim();

  // If the broadened query is identical to the original query or empty, it cannot be broadened further
  if (broadened.toLowerCase() === trimmed || broadened.length < 2) {
    return null;
  }

  return broadened;
}
