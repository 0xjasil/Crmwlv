import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PendingJobOrdersClient from './client';

export default async function PendingJobOrdersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const userRole = session.user.role || 'staff';
  const userId = session.user.id;

  let branches: { id: string; name: string }[] = [];
  let availableManagers: { id: string; name: string; email: string }[] = [];

  // If Admin, fetch all branches
  if (userRole === 'admin') {
    branches = await prisma.branch.findMany({
      select: { id: true, name: true },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  if (userRole === 'admin' || userRole === 'manager' || userRole === 'executive') {
       availableManagers = await prisma.user.findMany({
           where: {
               OR: [
                   { role: 'executive' },
                   { role: 'manager' },
                   { role: 'telecaller' } 
               ],
               banned: { not: true } 
           },
           select: { id: true, name: true, email: true },
           orderBy: { name: 'asc' }
       });
  }


  return (
    <PendingJobOrdersClient 
       userRole={userRole} 
       userId={userId} 
       branches={branches}
       availableManagers={availableManagers}
    />
  );
}
