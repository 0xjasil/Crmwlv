import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { TelecallerReportContent } from '@/components/reports/telecaller/telecaller-report-content';
import { TelecallerReportSkeleton } from '@/components/reports/telecaller/telecaller-report-skeleton';

export default async function TelecallerReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  // Check role-based access
  const userRole = session.user.role || 'telecaller';
  const hasAccess = ['admin', 'executive', 'telecaller'].includes(userRole);

  if (!hasAccess) {
    redirect('/reports');
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 p-6">
        <Suspense fallback={<TelecallerReportSkeleton />}>
          <TelecallerReportContent userId={session.user.id} userRole={userRole} />
        </Suspense>
      </div>
    </div>
  );
}