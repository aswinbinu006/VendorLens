import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.fuzzyConfig.findFirst({ where: { isActive: true } });
  console.log("=== ACTIVE FUZZY CONFIG ===");
  console.log(JSON.stringify(config, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

  const count = await prisma.signal.count();
  console.log("=== SIGNAL COUNT ===");
  console.log("signals count:", count);

  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 3
  });
  console.log("=== RECENT INGESTION RUNS ===");
  console.log(JSON.stringify(runs, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
