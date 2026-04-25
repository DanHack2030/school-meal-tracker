import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./dev.db"
    }
  }
});

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Administrador General',
      passwordHash: 'admin123',
      role: 'ADMIN',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      fullName: 'Profesor de Prueba',
      course: '1ero Básico A',
      passwordHash: 'password', // Intentionally simplistic for demo
      role: 'TEACHER',
    },
  });

  const parent = await prisma.user.upsert({
    where: { username: 'parent1' },
    update: {},
    create: {
      username: 'parent1',
      fullName: 'Apoderado de Prueba',
      passwordHash: 'password',
      role: 'PARENT',
    },
  });

  // Create a student if needed
  const student = await prisma.student.upsert({
    where: { id: '5b358e7e-9753-4653-ae53-d69a999a564b' },
    update: {},
    create: {
      id: '5b358e7e-9753-4653-ae53-d69a999a564b',
      name: 'John Doe',
      teacherId: teacher.id,
      parentId: parent.id,
      medicalInfo: 'Alergia severa al maní y la lactosa.'
    }
  });

  console.log({ admin, teacher, parent, student });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
