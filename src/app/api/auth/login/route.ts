import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }

    // Support both plain text (legacy seed) and bcrypt hashed passwords
    let passwordValid = false;
    if (user.passwordHash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      passwordValid = user.passwordHash === password;
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Tu cuenta ha sido desactivada. Por favor contacta al administrador.' }, { status: 403 });
    }

    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      } 
    });
    
    response.cookies.set('userId', user.id, { httpOnly: true, path: '/' });
    response.cookies.set('userRole', user.role, { httpOnly: true, path: '/' });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

