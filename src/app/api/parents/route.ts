import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    let studentsWhere: any = {};
    if (user?.course) {
      studentsWhere = { course: user.course };
    } else {
      studentsWhere = { teacherId: session.id };
    }

    const parents = await prisma.user.findMany({
      where: { 
        role: 'PARENT',
        OR: [
          { parentOf: { some: studentsWhere } },
          { parentOf: { none: {} } }
        ]
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        mustChangePassword: true,
        parentOf: {
          where: studentsWhere,
          select: {
            id: true,
            name: true,
            course: true,
            medicalInfo: true,
            meals: {
              where: {
                date: { gte: startOfDay, lte: endOfDay }
              },
              take: 1
            }
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { username: 'asc' }
    });

    return NextResponse.json(parents);
  } catch (error) {
    console.error('Get parents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fullName, password, studentIds, email } = await request.json();
    if (!fullName || !password || !email) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña son requeridos' }, { status: 400 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) return NextResponse.json({ error: 'El correo electrónico ya está en uso' }, { status: 409 });
    }

    // Generate username
    const nameParts = fullName.toLowerCase().trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    let baseUsername = lastName ? `${firstName}.${lastName}` : firstName;
    
    let username = baseUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const parent = await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash,
        role: 'PARENT',
        mustChangePassword: true,
        email: email || null,
        parentOf: studentIds && studentIds.length > 0
          ? { connect: studentIds.map((id: string) => ({ id })) }
          : undefined
      },
      select: { id: true, username: true, fullName: true, email: true, mustChangePassword: true }
    });

    return NextResponse.json(parent, { status: 201 });
  } catch (error) {
    console.error('Create parent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

