// src/components/users-table.tsx
'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch, IconDotsVertical, IconTrash } from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { UsersTableProps } from '@/types/user';
import { updateUserBranchAction, updateUserRoleAction, deleteUserAction } from '@/lib/actions/auth';
import { useAction } from 'next-safe-action/hooks';
import { User } from '@prisma/client';

export function UsersTable({ users, roles, branches }: UsersTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [updatingBranchUserId, setUpdatingBranchUserId] = useState<string | null>(null);

  const { execute: updateBranch } = useAction(updateUserBranchAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        router.refresh();
      }
    },
    onError: () => {
      toast.error('Failed to update user branch. Please try again.');
    },
    onSettled: () => {
      setUpdatingBranchUserId(null);
    },
  });

  const { execute: updateRole } = useAction(updateUserRoleAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        router.refresh();
      }
    },
    onError: () => {
      toast.error('Failed to update user role. Please try again.');
    },
    onSettled: () => {
      setUpdatingRoleUserId(null);
    },
  });

  const { execute: deleteUser } = useAction(deleteUserAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        setShowDeleteDialog(false);
        setUserToDelete(null);
        router.refresh();
      }
    },
    onError: () => {
      toast.error('Failed to delete user. Please try again.');
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.role && user.role.toLowerCase().includes(query)) ||
        (user.branch &&
          branches
            .find((b) => b.id === user.branch)
            ?.name.toLowerCase()
            .includes(query))
    );
  }, [users, searchQuery, branches]);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    deleteUser({ userId: userToDelete.id });
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setUserToDelete(null);
  };

  const handleRoleUpdate = async (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return;
    setUpdatingRoleUserId(userId);
    updateRole({ userId, role: newRole });
  };

  const handleBranchUpdate = async (
    userId: string,
    newBranchId: string,
    currentBranchId: string
  ) => {
    if (newBranchId === currentBranchId) return; // No change needed

    setUpdatingBranchUserId(userId);
    updateBranch({ userId, branchId: newBranchId });
  };

  const RoleSelect = ({ user }: { user: User }) => {
    const isUpdating = updatingRoleUserId === user.id;
    const currentRole = user.role || '';

    const getRoleDisplayText = (role: string | null) => {
      if (!role) return 'No Role';
      return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    };

    const getRoleColor = (role: string | null) => {
      if (!role) return 'text-muted-foreground';
      switch (role.toLowerCase()) {
        case 'admin':
          return 'text-rose-600 dark:text-rose-400 font-semibold';
        case 'executive':
          return 'text-blue-600 dark:text-blue-400 font-medium';
        case 'telecaller':
          return 'text-emerald-600 dark:text-emerald-400 font-medium';
        default:
          return 'text-slate-600 dark:text-slate-400 font-medium';
      }
    };

    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={currentRole}
          onValueChange={(newRole) => handleRoleUpdate(user.id, newRole, currentRole)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-32 h-7 text-xs border border-border/60 shadow-none px-2 focus:ring-1 focus:ring-ring bg-background">
            <SelectValue>
              <span className={`text-xs ${getRoleColor(currentRole)}`}>
                {getRoleDisplayText(currentRole)}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.name} className="cursor-pointer text-xs">
                <div className="flex flex-col">
                  <span className={`font-medium ${getRoleColor(role.name)}`}>
                    {getRoleDisplayText(role.name)}
                  </span>
                  {role.description && (
                    <span className="text-[10px] text-muted-foreground">{role.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating && (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  };

  const BranchSelect = ({ user }: { user: User }) => {
    const isUpdating = updatingBranchUserId === user.id;
    const currentBranchId = user.branch || '';

    const getBranchDisplayText = (branchId: string | null) => {
      if (!branchId) return 'No Branch';
      const branch = branches.find((b) => b.id === branchId);
      return branch ? branch.name : 'Unknown';
    };

    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={currentBranchId}
          onValueChange={(newBranchId) => handleBranchUpdate(user.id, newBranchId, currentBranchId)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-32 h-7 text-xs border border-border/60 shadow-none px-2 focus:ring-1 focus:ring-ring bg-background">
            <SelectValue>
              <span className="text-xs text-foreground font-medium">
                {getBranchDisplayText(currentBranchId)}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id} className="cursor-pointer text-xs">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {branch.name}
                  </span>
                  {branch.address && (
                    <span className="text-[10px] text-muted-foreground">{branch.address}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating && (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Toolbar */}
      <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="h-9 px-2.5 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Users Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Accounts ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[160px]">Assigned Role</TableHead>
                  <TableHead className="w-[160px]">Assigned Branch</TableHead>
                  <TableHead className="w-[130px]">Created Date</TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      No matching user accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-xs text-foreground">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <RoleSelect user={user} />
                      </TableCell>
                      <TableCell>
                        <BranchSelect user={user} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <IconDotsVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                              onClick={() => handleDeleteClick(user)}
                            >
                              <IconTrash className="mr-2 h-3.5 w-3.5" />
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove access for{' '}
              <span className="font-semibold text-foreground">{userToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeleting} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-xs text-white"
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
