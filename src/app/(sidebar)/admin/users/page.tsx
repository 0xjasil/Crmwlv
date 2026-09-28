// src/app/(sidebar)/admin/users/page.tsx
import { getAllUsers, getAllRoles, getAllBranches } from '@/lib/actions/auth';
import { UsersTable } from '@/components/users-table';
import { AddUserDialog } from '@/components/add-user-dialog';
import { PageContainer, PageHeader } from '@/components/ui/page-header';

export default async function UsersPage() {
  const [users, roles, branches] = await Promise.all([
    getAllUsers(),
    getAllRoles(),
    getAllBranches(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="User & Access Management"
        description="Provision team member accounts, configure branch assignments, and adjust RBAC role permissions."
        actions={<AddUserDialog roles={roles} branches={branches} />}
      />

      <UsersTable users={users} roles={roles} branches={branches} />
    </PageContainer>
  );
}
