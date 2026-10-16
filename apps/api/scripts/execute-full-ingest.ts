import { ingestionService } from '../src/modules/ingestion/ingestion.service.js';
import { prisma } from '../src/config/db.js';
import { env } from '../src/config/env.js';

async function main() {
  console.log('=== STARTING REAL FULL INGESTION RUN 1 ===');
  const run1 = await ingestionService.run({ mode: 'full', trigger: 'manual' });
  console.log('Run 1 Result:', JSON.stringify(run1, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const run1Row = await prisma.ingestionRun.findUnique({
    where: { id: run1.runId }
  });
  console.log('\n=== INGESTION_RUNS ROW 1 ===');
  console.log(JSON.stringify(run1Row, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  console.log('\n=== 3 SAMPLE STORED SIGNALS ===');
  const sampleSignals = await prisma.signal.findMany({
    take: 3,
    orderBy: { id: 'asc' }
  });
  for (const s of sampleSignals) {
    const rawStr = JSON.stringify(s.raw);
    const keyLeaked = env.OPENFDA_API_KEY && (rawStr.includes(env.OPENFDA_API_KEY) || (s.url && s.url.includes(env.OPENFDA_API_KEY)));
    console.log({
      id: s.id.toString(),
      sourceId: s.sourceId,
      firmName: s.firmName,
      classification: s.classification,
      reportDate: s.reportDate,
      url: s.url,
      contentHash: s.contentHash,
      keyLeakedInRecord: !!keyLeaked
    });
  }

  console.log('\n=== STARTING IMMEDIATE SECOND FULL INGESTION RUN 2 ===');
  const run2 = await ingestionService.run({ mode: 'full', trigger: 'manual' });
  console.log('Run 2 Result:', JSON.stringify(run2, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const run2Row = await prisma.ingestionRun.findUnique({
    where: { id: run2.runId }
  });
  console.log('\n=== INGESTION_RUNS ROW 2 ===');
  console.log(JSON.stringify(run2Row, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Ingestion script error:', err);
  process.exit(1);
});
