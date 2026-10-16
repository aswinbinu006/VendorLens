import { prisma } from '../src/config/db.js';
import { normalizeName } from '../src/modules/vendors/normalize.js';
import { trigramSimilarity, getFirstSignificantToken } from '../src/modules/matches/matcher.js';
import { env } from '../src/config/env.js';

/**
 * npm run match:report
 * For every vendor in the DB, prints the top 5 candidate firm names from stored signals
 * with similarity and the decision (auto/pending/discard).
 */
async function main() {
  const vendors = await prisma.vendor.findMany({
    include: { aliases: true },
    orderBy: { id: 'asc' },
  });

  if (vendors.length === 0) {
    console.log('\n[match:report] No vendors currently in the database. Add vendors via UI, API, or CSV import to generate matching reports.');
    await prisma.$disconnect();
    return;
  }

  // Fetch unique firm names from signals
  const firmsRaw = await prisma.signal.findMany({
    where: { firmName: { not: null } },
    select: { firmName: true, country: true },
    distinct: ['firmName'],
  });

  const threshold = env.MATCH_THRESHOLD ?? 0.60;

  console.log(`\n=== MATCH REPORT (Threshold = ${threshold}) ===\n`);

  for (const vendor of vendors) {
    console.log(`\nVendor: ${vendor.name} (ID: ${vendor.id}, Country: ${vendor.country || 'N/A'})`);
    console.log(`Aliases: ${vendor.aliases.map((a) => a.alias).join(', ') || 'None'}`);
    console.log('-'.repeat(80));

    const scoredFirms: Array<{
      firmName: string;
      similarity: number;
      decision: 'auto' | 'pending' | 'discard';
      reason: string;
    }> = [];

    for (const item of firmsRaw) {
      const firmName = item.firmName!;
      let normalizedFirm: string;
      try {
        normalizedFirm = normalizeName(firmName);
      } catch {
        continue;
      }

      // Check exact match on vendor name
      if (normalizedFirm === vendor.normalizedName) {
        scoredFirms.push({
          firmName,
          similarity: 1.0,
          decision: 'auto',
          reason: 'Exact normalized vendor name match',
        });
        continue;
      }

      // Check exact match on aliases
      const aliasMatch = vendor.aliases.find((a) => a.normalizedAlias === normalizedFirm);
      if (aliasMatch) {
        scoredFirms.push({
          firmName,
          similarity: 1.0,
          decision: 'auto',
          reason: `Exact match on alias "${aliasMatch.alias}"`,
        });
        continue;
      }

      // Trigram similarity against vendor name & aliases
      let bestScore = trigramSimilarity(normalizedFirm, vendor.normalizedName);
      let bestMatched = vendor.name;

      for (const a of vendor.aliases) {
        const score = trigramSimilarity(normalizedFirm, a.normalizedAlias);
        if (score > bestScore) {
          bestScore = score;
          bestMatched = a.alias;
        }
      }

      const firmFirstToken = getFirstSignificantToken(normalizedFirm);
      const vendorFirstToken = getFirstSignificantToken(
        bestMatched === vendor.name
          ? vendor.normalizedName
          : vendor.aliases.find((a) => a.alias === bestMatched)?.normalizedAlias || vendor.normalizedName
      );

      const sameFirstToken = firmFirstToken === vendorFirstToken;
      const qualifies = bestScore >= threshold && (sameFirstToken || bestScore >= 0.85);

      if (qualifies) {
        scoredFirms.push({
          firmName,
          similarity: Math.round(bestScore * 1000) / 1000,
          decision: 'pending',
          reason: `Similarity >= threshold ${sameFirstToken ? '(same first token)' : '(similarity >= 0.85)'}`,
        });
      } else {
        scoredFirms.push({
          firmName,
          similarity: Math.round(bestScore * 1000) / 1000,
          decision: 'discard',
          reason: bestScore < threshold ? 'Below threshold' : 'Different first token and similarity < 0.85',
        });
      }
    }

    // Sort by similarity descending, take top 5
    scoredFirms.sort((a, b) => b.similarity - a.similarity);
    const top5 = scoredFirms.slice(0, 5);

    top5.forEach((sf, i) => {
      console.log(
        `  ${i + 1}. [${sf.decision.toUpperCase()}] ${sf.firmName} | Sim: ${sf.similarity.toFixed(3)} | ${sf.reason}`
      );
    });
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('match:report error:', err);
  process.exit(1);
});
