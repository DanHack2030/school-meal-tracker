const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const meals = await prisma.mealRecord.findMany({
    orderBy: { date: 'desc' }
  });

  const seen = new Set();
  let deletedCount = 0;

  for (const meal of meals) {
    // get local date string (Chile time)
    const localDate = new Date(meal.date).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    const key = `${meal.studentId}-${localDate}`;
    
    if (seen.has(key)) {
      console.log(`Deleting duplicate for ${key}`);
      await prisma.mealRecord.delete({ where: { id: meal.id } });
      deletedCount++;
    } else {
      seen.add(key);
    }
  }

  console.log(`Deleted ${deletedCount} duplicate records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
