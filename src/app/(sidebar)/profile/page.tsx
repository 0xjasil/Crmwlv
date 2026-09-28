import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile/profile-form';
import { ChangePasswordForm } from '@/components/profile/change-password-form';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Profile',
  description: 'Manage your profile account settings',
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Personal Information</h4>
            <ProfileForm user={session.user} />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Security</h4>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
