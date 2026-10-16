import { prisma } from '../src/config/db.js';

/**
 * npm run demo:candidates
 * Prints the 40 firms with the most distinct recall events in stored data,
 * with their Class I/II/III event counts and country.
 * Pure read from real stored data.
 */
async function main() {
  const rows = await prisma.$queryRaw<
    Array<{
      firm_name: string;
      country: string | null;
      distinct_events: bigint;
      class_1_events: bigint;
      class_2_events: bigint;
      class_3_events: bigint;
    }>
  >`
    SELECT
      firm_name,
      country,
      COUNT(DISTINCT COALESCE(event_id, source_id)) AS distinct_events,
      COUNT(DISTINCT CASE WHEN severity_raw = 'Class I' THEN COALESCE(event_id, source_id) END) AS class_1_events,
      COUNT(DISTINCT CASE WHEN severity_raw = 'Class II' THEN COALESCE(event_id, source_id) END) AS class_2_events,
      COUNT(DISTINCT CASE WHEN severity_raw = 'Class III' THEN COALESCE(event_id, source_id) END) AS class_3_events
    FROM signals
    WHERE firm_name IS NOT NULL
    GROUP BY firm_name, country
    ORDER BY distinct_events DESC, firm_name ASC
    LIMIT 40;
  `;

  console.log('\n=== TOP 40 CANDIDATE FIRMS BY DISTINCT RECALL EVENTS (REAL STORED DATA) ===\n');
  console.log(
    'Rank'.padEnd(6) +
      'Firm Name'.padEnd(46) +
      'Country'.padEnd(16) +
      'Events'.padEnd(8) +
      'Class I'.padEnd(10) +
      'Class II'.padEnd(10) +
      'Class III'
  );
  console.log('-'.repeat(105));

  rows.forEach((r, idx) => {
    const rank = String(idx + 1).padEnd(6);
    const firm = (r.firm_name.length > 43 ? r.firm_name.slice(0, 40) + '...' : r.firm_name).padEnd(46);
    const country = (r.country || 'Unknown').padEnd(16);
    const events = String(r.distinct_events).padEnd(8);
    const c1 = String(r.class_1_events).padEnd(10);
    const c2 = String(r.class_2_events).padEnd(10);
    const c3 = String(r.class_3_events);
    console.log(`${rank}${firm}${country}${events}${c1}${c2}${c3}`);
  });

  console.log('\nTotal firms listed: ' + rows.length);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('demo:candidates error:', err);
  process.exit(1);
});
