import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        username: true,
        fullName: true,
        course: true,
        isActive: true,
        email: true,
      },
      orderBy: { fullName: 'asc' }
    });

    const teachersWithCorrectCount = await Promise.all(teachers.map(async (t) => {
      let count = 0;
      if (t.course) {
        count = await prisma.student.count({ where: { course: t.course } });
      } else {
        count = await prisma.student.count({ where: { teacherId: t.id } });
      }
      return { ...t, _count: { students: count } };
    }));

    return NextResponse.json(teachersWithCorrectCount);
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fullName, course, email } = await request.json();
    if (!fullName || !email) {
      return NextResponse.json({ error: 'Nombre completo y correo son requeridos' }, { status: 400 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) return NextResponse.json({ error: 'El correo electrónico ya está en uso' }, { status: 409 });
    }

    // Generate username: first.last (simplified)
    const nameParts = fullName.toLowerCase().trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    let baseUsername = lastName ? `${firstName}.${lastName}` : firstName;
    
    // Ensure uniqueness
    let username = baseUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const teacher = await prisma.user.create({
      data: {
        username,
        fullName,
        course,
        passwordHash,
        role: 'TEACHER',
        mustChangePassword: true,
        email: email || null
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        course: true,
        isActive: true,
        email: true
      }
    });

    return NextResponse.json({ ...teacher, tempPassword }, { status: 201 });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
