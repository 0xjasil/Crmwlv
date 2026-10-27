import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProfilePageClient } from '@/components/profile/profile-page-client';

export const metadata = {
  title: 'Profile Settings',
  description: 'Manage your profile and account security settings',
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return <ProfilePageClient user={session.user} />;
}
