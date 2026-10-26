// src/components/users-table.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSearch,
  IconDotsVertical,
  IconTrash,
  IconShieldLock,
  IconCheck,
  IconSparkles,
} from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { UsersTableProps, UserWithRole } from '@/types/user';
import { updateUserBranchAction, updateUserRoleAction, deleteUserAction } from '@/lib/actions/auth';
import { useAction } from 'next-safe-action/hooks';
import { SOFTWARE_POSITIONS, ALL_FEATURE_MODULES } from '@/constants/permissions';
import { getPositionDefinition, getUserEffectivePermissions } from '@/lib/permissions';
import { PermissionsDialog } from '@/components/users/permissions-dialog';

export function UsersTable({ users, roles, branches }: UsersTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [updatingBranchUserId, setUpdatingBranchUserId] = useState<string | null>(null);

  // State for permissions configuration modal
  const [configUser, setConfigUser] = useState<UserWithRole | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

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
      toast.error('Failed to update user position. Please try again.');
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

  const handleDeleteClick = (user: UserWithRole) => {
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
    if (newBranchId === currentBranchId) return;

    setUpdatingBranchUserId(userId);
    updateBranch({ userId, branchId: newBranchId });
  };

  const handleOpenPermissions = (user: UserWithRole) => {
    setConfigUser(user);
    setShowPermissionsDialog(true);
  };

  const PositionSelect = ({ user }: { user: UserWithRole }) => {
    const isUpdating = updatingRoleUserId === user.id;
    const currentPosition = getPositionDefinition(user.role);

    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={user.role || 'telecaller'}
          onValueChange={(newRole) => handleRoleUpdate(user.id, newRole, user.role || '')}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-44 h-8 text-xs border border-border/70 shadow-none px-2.5 focus:ring-1 focus:ring-ring bg-background">
            <SelectValue>
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-foreground truncate">
                  {currentPosition.shortTitle}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SOFTWARE_POSITIONS.map((pos) => (
              <SelectItem key={pos.id} value={pos.id} className="cursor-pointer text-xs">
                <div className="flex flex-col py-0.5">
                  <span className="font-medium text-foreground">{pos.title}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                    {pos.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  };

  const BranchSelect = ({ user }: { user: UserWithRole }) => {
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
          <SelectTrigger className="w-36 h-8 text-xs border border-border/70 shadow-none px-2 focus:ring-1 focus:ring-ring bg-background">
            <SelectValue>
              <span className="text-xs text-foreground font-medium truncate">
                {getBranchDisplayText(currentBranchId)}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id} className="cursor-pointer text-xs">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{branch.name}</span>
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
            placeholder="Search by name, email, or position..."
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
            Provisioned Team Accounts ({filteredUsers.length})
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Positions & feature logins fully controlled by Admin
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="w-[190px]">Software Position</TableHead>
                  <TableHead className="min-w-[280px]">Active Feature Permissions</TableHead>
                  <TableHead className="w-[170px]">Assigned Branch</TableHead>
                  <TableHead className="w-[110px]">Created</TableHead>
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
                  filteredUsers.map((user) => {
                    const effectivePerms = getUserEffectivePermissions(user);
                    const isAll = effectivePerms.includes('*');
                    const activeCount = isAll ? ALL_FEATURE_MODULES.length : effectivePerms.length;

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-foreground">{user.name}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PositionSelect user={user} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isAll ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-semibold"
                              >
                                Full System Admin (All Features)
                              </Badge>
                            ) : (
                              <>
                                {effectivePerms.slice(0, 3).map((permId) => {
                                  const mod = ALL_FEATURE_MODULES.find((m) => m.id === permId);
                                  return (
                                    <Badge
                                      key={permId}
                                      variant="outline"
                                      className="text-[10px] px-2 py-0 font-medium bg-background"
                                    >
                                      {mod?.label || permId}
                                    </Badge>
                                  );
                                })}
                                {effectivePerms.length > 3 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 font-medium"
                                  >
                                    +{effectivePerms.length - 3} more
                                  </Badge>
                                )}
                              </>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPermissions(user)}
                              className="h-6 text-[10px] px-2 ml-1 text-primary hover:bg-primary/10 hover:text-primary gap-1 font-medium"
                            >
                              <IconShieldLock className="size-3" />
                              Configure ({activeCount})
                            </Button>
                          </div>
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
                                className="text-xs font-medium cursor-pointer"
                                onClick={() => handleOpenPermissions(user)}
                              >
                                <IconShieldLock className="mr-2 h-3.5 w-3.5 text-primary" />
                                Configure Feature Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 cursor-pointer"
                                onClick={() => handleDeleteClick(user)}
                              >
                                <IconTrash className="mr-2 h-3.5 w-3.5" />
                                Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Configurator Modal */}
      <PermissionsDialog
        user={configUser}
        isOpen={showPermissionsDialog}
        onClose={() => {
          setShowPermissionsDialog(false);
          setConfigUser(null);
        }}
      />

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
