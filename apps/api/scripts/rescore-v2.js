import { PrismaClient } from '@prisma/client';
import { scoringService } from '../src/modules/scoring/scoring.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log("Checking pre-rescore alert count for kind = 'level_increase'...");
  const preAlerts = await prisma.alert.count({
    where: { kind: 'level_increase' }
  });
  console.log('Pre-rescore level_increase alerts:', preAlerts);

  console.log("Rescoring all vendors under active fuzzy_config v2...");
  const count = await scoringService.rescoreAllVendors();
  console.log(`Rescored ${count} vendors.`);

  const postAlerts = await prisma.alert.count({
    where: { kind: 'level_increase' }
  });
  console.log('Post-rescore level_increase alerts:', postAlerts);

  const delta = postAlerts - preAlerts;
  console.log('Alert delta (should be 0):', delta);

  if (delta !== 0) {
    console.error('FAILURE: S1 alerts were created during config upgrade!');
    process.exit(1);
  } else {
    console.log('SUCCESS: E21 verified - 0 S1 alerts created by config version change.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
