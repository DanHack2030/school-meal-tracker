import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const teacher = await prisma.user.upsert({
      where: { username: 'teacher1' },
      update: {},
      create: {
        username: 'teacher1',
        passwordHash: 'password', // Intentionally simplistic
        role: 'TEACHER',
      },
    });

    const parent = await prisma.user.upsert({
      where: { username: 'parent1' },
      update: {},
      create: {
        username: 'parent1',
        passwordHash: 'password',
        role: 'PARENT',
      },
    });

    await prisma.student.create({
      data: {
        name: 'John Doe',
        teacherId: teacher.id,
        parentId: parent.id,
      }
    });

    return NextResponse.json({ success: true, teacher, parent });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
