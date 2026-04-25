import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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
    const { fullName, password, studentIds, email } = await request.json();
    if (!fullName) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (existingEmail) return NextResponse.json({ error: 'El correo electrónico ya está en uso' }, { status: 409 });
    }

    const updateData: any = { fullName, email: email !== undefined ? (email || null) : undefined };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = true;
    }

    // Execute in transaction: 
    // 1. Unlink all students currently linked to this parent
    // 2. Link only the students provided in studentIds
    // 3. Update parent data
    const parent = await prisma.$transaction(async (tx) => {
      // Unlink previous
      await tx.student.updateMany({
        where: { parentId: id },
        data: { parentId: null }
      });

      // Link new ones
      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: { parentId: id }
        });
      }

      return await tx.user.update({
        where: { id },
        data: updateData,
        select: { id: true, username: true, fullName: true, email: true, mustChangePassword: true }
      });
    });

    return NextResponse.json(parent);
  } catch (error) {
    console.error('Update parent error:', error);
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

    // Unlink all students from this parent before deleting
    await prisma.student.updateMany({
      where: { parentId: id },
      data: { parentId: null }
    });

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete parent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
