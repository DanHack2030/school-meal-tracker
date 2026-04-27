const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const meals = await prisma.mealRecord.findMany({
    orderBy: { date: 'desc' },
    take: 5,
    include: { student: true }
  });
  console.log(JSON.stringify(meals, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
