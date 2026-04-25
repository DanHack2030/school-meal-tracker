import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/prisma';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();
    
    if (!credential) {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Token de Google inválido' }, { status: 401 });
    }
    
    const email = payload.email;
    
    // Buscar al usuario por correo electrónico
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Tu correo no está registrado en el sistema. Por favor, contacta al administrador para vincular tu cuenta de Google.' 
      }, { status: 403 });
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
    console.error('Google Auth error:', error);
    return NextResponse.json({ error: 'Error de validación con Google.' }, { status: 500 });
  }
}
