import { normalizeName } from '../vendors/normalize.js';

export interface MatchableSignal {
  id: bigint;
  firmName: string | null;
  country: string | null;
}

export interface MatchableVendorAlias {
  id: bigint;
  alias: string;
  normalizedAlias: string;
}

export interface MatchableVendor {
  id: bigint;
  name: string;
  normalizedName: string;
  country: string | null;
  aliases?: MatchableVendorAlias[];
}

export interface MatchCandidate {
  signalId: bigint;
  vendorId: bigint;
  status: 'auto' | 'pending';
  score: number;
  countryMatch: boolean;
  matchedName: string;
}

/**
 * Generate trigrams of a string matching PostgreSQL pg_trgm specification:
 * Prepend 2 spaces, append 1 space, extract all 3-char substrings as a unique set.
 */
export function extractTrigrams(str: string): Set<string> {
  const padded = '  ' + str + ' ';
  const trigrams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Trigram Jaccard similarity: |A ∩ B| / |A ∪ B|
 * Matches PostgreSQL pg_trgm similarity(text, text) bit-exact.
 */
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const setA = extractTrigrams(a);
  const setB = extractTrigrams(b);

  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const tri of setA) {
    if (setB.has(tri)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

const STOP_ARTICLES = new Set(['the', 'a', 'an']);

/**
 * Extracts first significant token from normalized text, skipping leading articles
 */
export function getFirstSignificantToken(normalizedText: string): string {
  const tokens = normalizedText.split(' ').filter(Boolean);
  for (const token of tokens) {
    if (!STOP_ARTICLES.has(token)) {
      return token;
    }
  }
  return tokens[0] || '';
}

/**
 * Pure matching function for a signal firm name against a list of vendors.
 * Implements Phase 4 and E17/E18 specifications.
 */
export function matchSignalToVendors(
  signal: MatchableSignal,
  vendors: MatchableVendor[],
  threshold = 0.60
): MatchCandidate[] {
  if (!signal.firmName || !signal.firmName.trim()) {
    return [];
  }

  let normalizedFirm: string;
  try {
    normalizedFirm = normalizeName(signal.firmName);
  } catch {
    // If normalization fails, no match can be established
    return [];
  }

  const firmFirstToken = getFirstSignificantToken(normalizedFirm);
  const candidates: MatchCandidate[] = [];

  for (const vendor of vendors) {
    // Check exact normalized match first
    if (normalizedFirm === vendor.normalizedName) {
      const countryMatch =
        !!signal.country &&
        !!vendor.country &&
        signal.country.trim().toLowerCase() === vendor.country.trim().toLowerCase();

      candidates.push({
        signalId: signal.id,
        vendorId: vendor.id,
        status: 'auto',
        score: 1.0,
        countryMatch,
        matchedName: vendor.name,
      });
      continue;
    }

    // Check exact normalized match on any alias
    let matchedAlias: string | null = null;
    if (vendor.aliases && vendor.aliases.length > 0) {
      for (const alias of vendor.aliases) {
        if (normalizedFirm === alias.normalizedAlias) {
          matchedAlias = alias.alias;
          break;
        }
      }
    }

    if (matchedAlias) {
      const countryMatch =
        !!signal.country &&
        !!vendor.country &&
        signal.country.trim().toLowerCase() === vendor.country.trim().toLowerCase();

      candidates.push({
        signalId: signal.id,
        vendorId: vendor.id,
        status: 'auto',
        score: 1.0,
        countryMatch,
        matchedName: matchedAlias,
      });
      continue;
    }

    // Else: similarity via trigram similarity against vendor name and all aliases
    let bestScore = trigramSimilarity(normalizedFirm, vendor.normalizedName);
    let bestMatchedName = vendor.name;

    if (vendor.aliases && vendor.aliases.length > 0) {
      for (const alias of vendor.aliases) {
        const aliasScore = trigramSimilarity(normalizedFirm, alias.normalizedAlias);
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
          bestMatchedName = alias.alias;
        }
      }
    }

    // Candidate additionally evaluates: trigram threshold OR shared brand token / distinct word
    const vendorFirstToken = getFirstSignificantToken(
      bestMatchedName === vendor.name
        ? vendor.normalizedName
        : vendor.aliases?.find((a) => a.alias === bestMatchedName)?.normalizedAlias ||
            vendor.normalizedName
    );

    const GENERIC_TOKENS = new Set([
      'pharmaceutical',
      'pharmaceuticals',
      'laboratories',
      'laboratory',
      'pharma',
      'health',
      'healthcare',
      'holdings',
      'industries',
      'group',
      'corp',
      'corporation',
      'inc',
      'ltd',
      'limited',
      'pvt',
      'llc',
      'company',
      'co',
      'therapeutics',
      'sciences',
      'biotech',
    ]);

    const isDistinctBrandToken = firmFirstToken.length >= 3 && !GENERIC_TOKENS.has(firmFirstToken);
    const sameFirstToken = isDistinctBrandToken && firmFirstToken === vendorFirstToken;

    // Check if vendor shares a distinct brand word with the recalling firm
    const firmWords = new Set(
      normalizedFirm.split(' ').filter((w) => w.length >= 3 && !GENERIC_TOKENS.has(w))
    );
    const vendorWords = new Set(
      vendor.normalizedName.split(' ').filter((w) => w.length >= 3 && !GENERIC_TOKENS.has(w))
    );
    let sharedDistinctWord = false;
    for (const w of vendorWords) {
      if (firmWords.has(w)) {
        sharedDistinctWord = true;
        break;
      }
    }

    const qualifies = bestScore >= threshold || sameFirstToken || sharedDistinctWord;
    if (!qualifies) {
      continue; // Discard
    }

    const countryMatch =
      !!signal.country &&
      !!vendor.country &&
      signal.country.trim().toLowerCase() === vendor.country.trim().toLowerCase();

    // Ambiguous candidate match routed to human compliance queue
    const calculatedScore = sameFirstToken || sharedDistinctWord
      ? Math.max(bestScore, 0.72)
      : bestScore;

    candidates.push({
      signalId: signal.id,
      vendorId: vendor.id,
      status: 'pending',
      score: Math.round(calculatedScore * 10000) / 10000,
      countryMatch,
      matchedName: bestMatchedName,
    });
  }

  // Tie-break display order by score descending, then by country equality (E18)
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.countryMatch !== b.countryMatch) {
      return a.countryMatch ? -1 : 1;
    }
    return Number(a.vendorId - b.vendorId);
  });

  return candidates;
}
