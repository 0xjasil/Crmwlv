import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { IncomeReportContent } from '@/components/reports/financial/income-report-content';
import { FinancialReportSkeleton } from '@/components/reports/financial/financial-report-skeleton';

export default async function IncomeReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const userRole = session.user.role || 'telecaller';
  const hasAccess = ['admin', 'executive'].includes(userRole);

  if (!hasAccess) {
    redirect('/reports');
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 p-6">
        <Suspense fallback={<FinancialReportSkeleton />}>
          <IncomeReportContent />
        </Suspense>
      </div>
    </div>
  );
}