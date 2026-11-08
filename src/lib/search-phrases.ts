import { decodeHtmlEntities } from "@/lib/utils";

export interface CandidateProduct {
  id?: string | number;
  name: string;
  category?: string | null;
  slug?: string;
  price?: string | null;
  imageUrl?: string | null;
}

export interface CandidateCategory {
  id?: string | number;
  name: string;
  slug?: string;
}

// Noise patterns to strip from raw product titles
const NOISE_PATTERNS = [
  /\s*[\(\[].*?[\)\]]/gi, // [Warm White], (Pack of 10)
  /\b(?:pack|pk|box|case|bag)\s+of\s+\d+\b/gi,
  /\b\d+\s*(?:pack|pk|pcs|pieces?|set)\b/gi,
  /\b(?:issue|vol|volume|edition|part|no\.?)\s*\d+/gi,
  /\b\d+[-/](?:pin|way|gang|core|pack)\b/gi,
  /\b\d+(?:\.\d+)?\s*(?:w|v|watt|watts|volt|volts|amp|amps|ah|mah|hz|khz|mhz|mm|cm|m)\b/gi,
  /[^\w\s\-\&]/g, // special punctuation
];

const STOP_WORDS = new Set([
  "a", "an", "and", "the", "in", "on", "at", "for", "with", "by", "of", "to", "or", "from",
  "pack", "set", "new", "original", "genuine"
]);

function cleanText(text: string): string {
  let cleaned = decodeHtmlEntities(text);
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Extracts high-intent, natural multi-product search query phrases
 * from a set of products and categories matching the user's input.
 */
export function extractSearchSuggestions(
  rawQuery: string,
  products: CandidateProduct[] = [],
  categories: CandidateCategory[] = []
): string[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const queryTokens = query.split(/\s+/).filter((t) => t.length > 0);
  const suggestionScores = new Map<string, number>();

  // Helper to add suggestion with scoring
  const addCandidate = (phrase: string, baseScore: number) => {
    const cleanPhrase = phrase.trim().replace(/\s+/g, " ");
    const lowerPhrase = cleanPhrase.toLowerCase();

    // Skip if identical to query, empty, too long (>40 chars or >4 words), or too short (<3 chars)
    if (lowerPhrase === query || lowerPhrase.length < 3 || lowerPhrase.length > 40) {
      return;
    }
    const wordCount = lowerPhrase.split(" ").length;
    if (wordCount > 4 || wordCount < 1) {
      return;
    }

    // Must match at least part of the query tokens
    const matchesQuery = queryTokens.some((qt) => lowerPhrase.includes(qt));
    if (!matchesQuery) return;

    const currentScore = suggestionScores.get(lowerPhrase) || 0;
    suggestionScores.set(lowerPhrase, currentScore + baseScore);
  };

  // 1. Process categories matching query
  for (const cat of categories) {
    const cleanCat = cleanText(cat.name);
    addCandidate(cleanCat, 15);
  }

  // 2. Process products to extract 2-to-3 word descriptors
  for (const prod of products) {
    const cleanedTitle = cleanText(prod.name);
    const words = cleanedTitle.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));

    // Generate 2-word and 3-word n-grams
    for (let i = 0; i < words.length; i++) {
      if (i + 1 < words.length) {
        const biGram = `${words[i]} ${words[i + 1]}`;
        addCandidate(biGram, 5);
      }
      if (i + 2 < words.length) {
        const triGram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        addCandidate(triGram, 4);
      }
    }

    // Combine descriptor + category (e.g. "Fluorescent" + "Light Bulbs")
    if (prod.category) {
      const cleanCat = cleanText(prod.category);
      for (const word of words) {
        const lowerWord = word.toLowerCase();
        if (!cleanCat.toLowerCase().includes(lowerWord) && !STOP_WORDS.has(lowerWord)) {
          addCandidate(`${word} ${cleanCat}`, 8);
        }
      }
    }
  }

  // Sort by score descending and return top 5 in Title Case
  return Array.from(suggestionScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => toTitleCase(phrase))
    .filter((phrase, index, self) => self.indexOf(phrase) === index)
    .slice(0, 5);
}
