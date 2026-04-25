import { cookies } from 'next/headers';

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  const userRole = cookieStore.get('userRole')?.value;
  
  if (!userId || !userRole) return null;
  return { id: userId, role: userRole };
}
