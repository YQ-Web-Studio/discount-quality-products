/**
 * Gibberish and Keyboard-Mash Detector
 *
 * Distinguishes unpronounceable random keyboard mash (e.g. "aekjsghslggjkfdg")
 * from valid queries, partial prefixes, typos, brands, and technical hardware codes
 * (e.g. "hel", "hell", "hello", "cr2032", "gx24q", "lightbulbs", "schneider").
 */

/**
 * Checks whether a given search string is unpronounceable keyboard mash / gibberish.
 * Returns true ONLY for unambiguous gibberish where no plausible similar catalog item can exist.
 */
export function isGibberishQuery(query: string): boolean {
  if (!query) return false;
  const clean = query.trim().toLowerCase();

  // Queries shorter than 5 characters are never classified as gibberish
  // (allows acronyms, bulb cap codes like "b22", "e27", "t8", "hel", etc.)
  if (clean.length < 5) {
    return false;
  }

  // Allow technical alphanumeric part numbers with digits (e.g. "cr2032", "gx24q-3", "el4x14")
  const hasDigits = /\d/.test(clean);

  // 1. Extreme consonant clusters (6+ consecutive consonants without any vowels or 'y')
  // In English / technical naming, 6 consecutive consonants almost never occur.
  // Example: "aekjsghslggjkfdg" contains "ghslggjkfdg" (11 consecutive consonants).
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(clean)) {
    return true;
  }

  // 2. Vowel ratio check for longer single words (length >= 10, without digits)
  // Natural English words and brand names have at least ~15% vowels (including 'y').
  if (!hasDigits) {
    const words = clean.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const letters = word.replace(/[^a-z]/g, "");
      if (letters.length >= 10) {
        const vowels = letters.match(/[aeiouy]/g) || [];
        const vowelRatio = vowels.length / letters.length;
        if (vowelRatio < 0.15) {
          return true;
        }
      }
    }
  }

  // 3. Obvious keyboard row mash patterns (5+ consecutive keys along QWERTY rows)
  // e.g. "qwerty", "asdfgh", "zxcvbn"
  const qwertyRows = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
  ];
  for (const row of qwertyRows) {
    for (let i = 0; i <= row.length - 5; i++) {
      const slice = row.slice(i, i + 5);
      if (clean.includes(slice)) {
        return true;
      }
    }
  }

  // 4. Excessive identical repeated characters (e.g. "aaaaa", "zzzzzz")
  if (/(.)\1{4,}/.test(clean)) {
    return true;
  }

  return false;
}
