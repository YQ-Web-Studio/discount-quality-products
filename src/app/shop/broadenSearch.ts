/**
 * Helper to auto-broaden search queries when zero exact matches are found.
 * Strips specifications, packaging noise, plural inflections, and stop words
 * to extract core searchable terms.
 */

const STOP_AND_NOISE_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "for", "with", "by", "of", "to", "or", "from",
  "pack", "pk", "box", "case", "bag", "set", "rare", "super", "best", "genuine", "original",
  "piece", "pieces", "pcs", "new", "used", "vintage"
]);

const SPEC_PATTERNS = [
  /\b\d+\s*(?:w|v|watt|watts|volt|volts|amp|amps|ah|mah|hz|khz|mhz|mm|cm|m)\b/gi,
  /\b\d+\s*(?:pc|pack|pk|pcs|pieces?|way|gang|core|pin)\b/gi,
  /\b\d+[-/](?:pc|way|gang|core|pin|pack)\b/gi,
  /\b\d+\b/g, // standalone numbers
  /[^\w\s]/g, // punctuation
];

const KNOWN_COMPOUNDS: Record<string, string> = {
  lightbulbs: "light bulb",
  lightbulb: "light bulb",
  spotlights: "spotlight",
  downlights: "downlight",
  lampshades: "lampshade",
  floodlights: "floodlight",
};

/**
 * Normalise English plural suffixes to singular lemma.
 */
export function stemToken(word: string): string {
  const w = word.toLowerCase().trim();
  if (KNOWN_COMPOUNDS[w]) {
    return KNOWN_COMPOUNDS[w];
  }

  if (w.length <= 3) return w;

  // e.g. batteries -> battery
  if (w.endsWith("ies") && w.length > 4) {
    return w.slice(0, -3) + "y";
  }

  // e.g. switches, boxes -> switch, box
  if ((w.endsWith("shes") || w.endsWith("ches") || w.endsWith("xes") || w.endsWith("sses")) && w.length > 4) {
    return w.slice(0, -2);
  }

  // e.g. bulbs, candles, lamps -> bulb, candle, lamp (avoid words ending in 'ss' like 'glass')
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) {
    return w.slice(0, -1);
  }

  return w;
}

export function broadenSearchQuery(query: string): string | null {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return null;

  // Check known compounds first
  if (KNOWN_COMPOUNDS[trimmed]) {
    return KNOWN_COMPOUNDS[trimmed];
  }

  let cleaned = trimmed;
  for (const pattern of SPEC_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const significantTokens = rawTokens.filter((token) => !STOP_AND_NOISE_WORDS.has(token) && token.length >= 2);

  if (significantTokens.length === 0) {
    return null;
  }

  // If single token, attempt stemming or prefix relaxation
  if (significantTokens.length === 1) {
    const single = significantTokens[0];
    const stemmed = stemToken(single);
    if (stemmed !== single) {
      return stemmed;
    }

    // Double-consonant loosening: e.g. "hell" -> "hel"
    if (single.length >= 4 && /(.)\1$/.test(single)) {
      return single.slice(0, -1);
    }

    return null;
  }

  // Multi-token: stem each token and pick up to first 3
  const stemmedTokens = significantTokens.map(stemToken);
  const broadened = stemmedTokens.slice(0, 3).join(" ").trim();

  // If the broadened query is identical to the original query or empty, return null
  if (broadened.toLowerCase() === trimmed || broadened.length < 2) {
    return null;
  }

  return broadened;
}
