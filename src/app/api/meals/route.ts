import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(`${from}T00:00:00.000-04:00`);
      dateFilter.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999-04:00`);
      dateFilter.lte = d;
    }

    // Build student filter based on role
    let studentFilter: any = {};
    if (studentId) {
      studentFilter.id = studentId;
    } else if (session.role === 'TEACHER') {
      const user = await prisma.user.findUnique({ where: { id: session.id } });
      if (user?.course) {
        studentFilter = { course: user.course };
      } else {
        studentFilter = { teacherId: session.id };
      }
    } else {
      studentFilter.parentId = session.id;
    }

    // Verify authorization for single student queries
    if (studentId) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, include: { teacher: true }});
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      if (session.role === 'TEACHER') {
        const user = await prisma.user.findUnique({ where: { id: session.id } });
        const matchesCourse = user?.course && (student.course === user.course || student.teacher?.course === user.course);
        if (student.teacherId !== session.id && !matchesCourse) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
      } else if (session.role === 'PARENT' && student.parentId !== session.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const meals = await prisma.mealRecord.findMany({
      where: {
        student: studentFilter,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        student: { select: { id: true, name: true } },
        teacher: { select: { username: true, fullName: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(meals);
  } catch (error) {
    console.error('Get meals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, date, menuText, menuImage, consumption, observation } = body;

    if (!studentId || !consumption) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { teacher: true } });
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    const matchesCourse = user?.course && (student?.course === user.course || student?.teacher?.course === user.course);

    if (!student || (student.teacherId !== session.id && !matchesCourse)) {
      return NextResponse.json({ error: 'Unauthorized or student not found' }, { status: 403 });
    }

    // Use the client's local date string if provided (YYYY-MM-DD), or fallback to ISO substring
    const dateString = date.length === 10 ? date : new Date(date).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    const startOfDay = new Date(`${dateString}T00:00:00.000-04:00`);
    const endOfDay = new Date(`${dateString}T23:59:59.999-04:00`);

    const existingMeal = await prisma.mealRecord.findFirst({
      where: {
        studentId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { date: 'desc' }
    });

    if (existingMeal) {
      // Update existing
      const updatedMeal = await prisma.mealRecord.update({
        where: { id: existingMeal.id },
        data: { 
          menuText,
          menuImage,
          consumption,
          observation,
          teacherId: session.id
        }
      });
      return NextResponse.json(updatedMeal);
    }

    const meal = await prisma.mealRecord.create({
      data: {
        studentId,
        teacherId: session.id,
        date: new Date(), // Always save current absolute time
        menuText,
        menuImage,
        consumption,
        observation
      }
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error('Create meal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
