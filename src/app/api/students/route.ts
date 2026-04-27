import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    let whereClause: any = {};
    if (session.role === 'TEACHER') {
      // Teachers can now see all students/courses
      whereClause = {};
    } else {
      whereClause = { parentId: session.id };
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        teacher: {
          select: {
            course: true
          }
        },
        meals: {
          where: {
            date: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }
      }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, age, course, medicalInfo, parentId } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
}

    const user = await prisma.user.findUnique({ where: { id: session.id } });

    const student = await prisma.student.create({
      data: {
        name,
        age: age ? parseInt(age.toString()) : null,
        course: course || user?.course || null,
        medicalInfo: medicalInfo || null,
        teacherId: session.id,
        parentId: parentId || null
      }
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
