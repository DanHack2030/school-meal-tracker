import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const studentId = '5b358e7e-9753-4653-ae53-d69a999a564b';
  
  // Set some medical info too
  await prisma.student.update({
    where: { id: studentId },
    data: { medicalInfo: 'Alergia severa al maní y la lactosa. Debe evitar productos procesados sin etiqueta.' }
  });

  // Create meals for the last 5 days
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // For today (i=0), let's create an alert (NADA)
    const intake = i === 0 ? 'NADA' : (i % 2 === 0 ? 'TODO' : '1/2');
    
    await prisma.mealRecord.create({
      data: {
        studentId,
        date,
        mainCourse: intake,
        salad: intake === 'NADA' ? '1/4' : intake,
        dessert: 'TODO',
      }
    });
  }
}

main().then(() => prisma.$disconnect());
