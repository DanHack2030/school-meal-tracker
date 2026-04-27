import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateString = searchParams.get('dateString');

    if (!dateString) {
      return NextResponse.json({ error: 'dateString parameter is required' }, { status: 400 });
    }

    const menus = await prisma.dailyMenu.findMany({
      where: { dateString },
      orderBy: { optionNumber: 'asc' }
    });

    return NextResponse.json(menus);
  } catch (error) {
    console.error('Error fetching daily menus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dateString, optionNumber, menuText } = await request.json();

    if (!dateString || optionNumber === undefined || !menuText) {
      return NextResponse.json({ error: 'dateString, optionNumber, and menuText are required' }, { status: 400 });
    }

    const menu = await prisma.dailyMenu.upsert({
      where: {
        dateString_optionNumber: {
          dateString,
          optionNumber
        }
      },
      update: {
        menuText
      },
      create: {
        dateString,
        optionNumber,
        menuText
      }
    });

    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error saving daily menu:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
