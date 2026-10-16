import { AppError } from '../../middleware/error.js';

// Legal suffixes to strip from the end of company names.
// Note: discriminating words like 'pharma', 'pharmaceuticals', 'laboratories', 'healthcare' are NEVER stripped.
const LEGAL_SUFFIX_PATTERNS = [
  // Compound suffixes first
  /\b(?:pvt|private)\s+(?:ltd|limited)$/i,
  /\b(?:pte|perm)\s+(?:ltd|limited)$/i,
  /\bco(?:mpany)?\s+(?:ltd|limited)$/i,
  /\bgmbh\s+and\s+co(?:\s+kg)?$/i,
  /\band\s+co(?:mpany)?$/i,
  // Suffixes formed from periods like S.A., B.V., S.A.S., N.V. (which become spaced letters)
  // Ensure "u s a" (USA) is preserved and not mistaken for "s a" (S.A.)
  /\bs\s+a\s+s$/i,
  /(?<!\bu\s+)\bs\s+a$/i,
  /\bb\s+v$/i,
  /\bn\s+v$/i,
  /\ba\s+g$/i,
  // Single suffixes
  /\b(?:inc|incorporated|ltd|limited|llc|lp|llp|corp|corporation|co|company|gmbh|plc|sa|ag|bv|nv|pvt|private|pte|srl|sas)$/i,
];

/**
 * Pure normalization function for vendor and entity names (no I/O).
 * Performs Unicode NFKD normalization, strips diacritics, lowercases,
 * converts '&' to 'and', removes punctuation, collapses whitespace,
 * and strips trailing legal entity suffixes.
 */
export function normalizeName(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new AppError(422, 'VALIDATION_ERROR', 'Vendor name cannot be empty');
  }

  // 1. Unicode NFKD normalization & strip diacritics
  let text = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // 2. Lowercase
  text = text.toLowerCase();

  // 3. Replace '&' with ' and '
  text = text.replace(/&/g, ' and ');

  // 3b. E19: Delete apostrophes so e.g. "Dr. Reddy's" and "Dr Reddys" normalize equal
  text = text.replace(/['’]/g, '');

  // 4. Remove punctuation (replace any non-alphanumeric, non-space character with space)
  text = text.replace(/[^\p{L}\p{N}\s]/gu, ' ');

  // 5. Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 6. Iteratively strip trailing legal suffixes
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of LEGAL_SUFFIX_PATTERNS) {
      if (pattern.test(text)) {
        text = text.replace(pattern, '').trim();
        changed = true;
      }
    }
  }

  // Final collapse and trim
  text = text.replace(/\s+/g, ' ').trim();

  // 7. If result is empty or consists purely of conjunctions like "and", the name is invalid
  const words = text.split(' ').filter(Boolean);
  const nonConjunctionWords = words.filter((w) => w !== 'and');

  if (!text || nonConjunctionWords.length === 0) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      `Vendor name "${input}" is invalid because it contains no recognizable name characters after normalization`
    );
  }

  return text;
}
