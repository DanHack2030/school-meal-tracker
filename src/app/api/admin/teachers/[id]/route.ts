import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { fullName, course, isActive, password, email } = await request.json();

    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (existingEmail) return NextResponse.json({ error: 'El correo electrónico ya está en uso' }, { status: 409 });
    }

    const data: any = {
      fullName: fullName !== undefined ? fullName : undefined,
      course: course !== undefined ? course : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
      email: email !== undefined ? (email || null) : undefined,
    };

    if (password) {
      const bcrypt = require('bcryptjs');
      data.passwordHash = await bcrypt.hash(password, 10);
      data.mustChangePassword = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        course: true,
        isActive: true,
        email: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if teacher has students
    const teacher = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } }
    });

    if (teacher?._count.students && teacher._count.students > 0) {
      return NextResponse.json({ error: 'Cannot delete teacher with assigned students' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
