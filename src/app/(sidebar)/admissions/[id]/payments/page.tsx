import { redirect } from 'next/navigation';

export default function LegacyAdmissionPaymentsRoute() {
  redirect('/invoices');
}
