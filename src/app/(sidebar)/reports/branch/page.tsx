import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { BranchReportContent } from '@/components/reports/branch/branch-report-content';
import { BranchReportSkeleton } from '@/components/reports/branch/branch-report-skeleton';

export default async function BranchReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  // Check role-based access
  const userRole = session.user.role || 'telecaller';
  const hasAccess = ['admin', 'executive'].includes(userRole);

  if (!hasAccess) {
    redirect('/reports');
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 p-6">
        <Suspense fallback={<BranchReportSkeleton />}>
          <BranchReportContent userId={session.user.id} userRole={userRole} />
        </Suspense>
      </div>
    </div>
  );
}
