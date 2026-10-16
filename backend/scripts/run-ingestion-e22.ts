import { PrismaClient } from '@prisma/client';
import { ingestionService } from '../src/modules/ingestion/ingestion.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('=== RUNNING FULL INGESTION (E22 Verification) ===');
  const countBefore = await prisma.signal.count();
  console.log('Signal count before run:', countBefore);

  const run1 = await ingestionService.run({ mode: 'full', trigger: 'manual' });
  console.log('--- Ingestion Run 1 Completed ---');
  console.log(JSON.stringify(run1, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const countAfter1 = await prisma.signal.count();
  console.log('Signal count after Run 1:', countAfter1);

  // Find stored record without traditional recall_number (synthetic source_id)
  const syntheticSignal = await prisma.signal.findFirst({
    where: {
      sourceId: { contains: ':' }
    }
  });

  console.log('--- Stored Record with Synthetic Source ID (E22) ---');
  if (syntheticSignal) {
    console.log(JSON.stringify({
      id: syntheticSignal.id.toString(),
      sourceId: syntheticSignal.sourceId,
      eventId: syntheticSignal.eventId,
      firmName: syntheticSignal.firmName,
      title: syntheticSignal.title,
      reportDate: syntheticSignal.reportDate
    }, null, 2));
  } else {
    console.log('No signal found with colon in sourceId.');
  }

  console.log('\n=== RE-RUNNING INGESTION (Idempotency Verification) ===');
  const run2 = await ingestionService.run({ mode: 'full', trigger: 'manual' });
  console.log('--- Ingestion Run 2 Completed ---');
  console.log(JSON.stringify(run2, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const countAfter2 = await prisma.signal.count();
  console.log('Signal count after Run 2:', countAfter2);
  console.log(`Run 2 results: newRecords=${run2.newRecords}, updatedRecords=${run2.updatedRecords}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
