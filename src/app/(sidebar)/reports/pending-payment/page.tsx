import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PendingPaymentReportContent } from '@/components/reports/financial/pending-payment-report-content';
import { FinancialReportSkeleton } from '@/components/reports/financial/financial-report-skeleton';

export default async function PendingPaymentReportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const userRole = session.user.role || 'telecaller';
  const hasAccess = ['admin', 'executive', 'telecaller'].includes(userRole);

  if (!hasAccess) {
    redirect('/reports');
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 p-6">
        <Suspense fallback={<FinancialReportSkeleton />}>
          <PendingPaymentReportContent />
        </Suspense>
      </div>
    </div>
  );
}