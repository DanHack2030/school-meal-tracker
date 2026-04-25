const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { course: null },
    include: { teacher: true }
  });
  
  for (const s of students) {
    if (s.teacher?.course) {
      await prisma.student.update({
        where: { id: s.id },
        data: { course: s.teacher.course }
      });
      console.log(`Recovered student ${s.name} to course ${s.teacher.course}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
