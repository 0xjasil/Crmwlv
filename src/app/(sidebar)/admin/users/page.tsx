// src/app/(sidebar)/admin/users/page.tsx
import { getAllUsers, getAllRoles, getAllBranches } from '@/lib/actions/auth';
import { UsersTable } from '@/components/users-table';
import { AddUserDialog } from '@/components/add-user-dialog';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasFeatureAccess } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !hasFeatureAccess(session.user, 'users_management')) {
    redirect('/dashboard');
  }

  let users: any[] = [];
  let roles: any[] = [];
  let branches: any[] = [];

  try {
    const results = await Promise.allSettled([
      getAllUsers(),
      getAllRoles(),
      getAllBranches(),
    ]);

    users = results[0].status === 'fulfilled' ? results[0].value : [];
    roles = results[1].status === 'fulfilled' ? results[1].value : [];
    branches = results[2].status === 'fulfilled' ? results[2].value : [];
  } catch (err) {
    console.warn('[Admin Users] Notice loading user management data:', err);
  }

  return (
    <PageContainer>
      <PageHeader
        title="User & Access Management"
        description="Provision team member accounts, assign software workflow positions, and adjust granular RBAC feature permissions."
        actions={<AddUserDialog roles={roles} branches={branches} />}
      />

      <UsersTable users={users} roles={roles} branches={branches} />
    </PageContainer>
  );
}
