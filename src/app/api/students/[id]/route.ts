import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, age, course, medicalInfo, parentId } = await request.json();

    const user = await prisma.user.findUnique({ where: { id: session.id } });

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: name || undefined,
        age: age !== undefined ? (age ? parseInt(age.toString()) : null) : undefined,
        course: course !== undefined ? (course || user?.course || null) : undefined,
        parentId: parentId !== undefined ? (parentId || null) : undefined,
        medicalInfo: medicalInfo !== undefined ? (medicalInfo || null) : undefined,
      }
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Delete all meal records for this student first to avoid foreign key issues
    await prisma.mealRecord.deleteMany({
      where: { studentId: id }
    });

    // 2. Delete the student
    await prisma.student.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
