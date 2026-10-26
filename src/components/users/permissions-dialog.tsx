// src/components/users/permissions-dialog.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_FEATURE_MODULES,
  FeatureKey,
  FeatureModule,
  SOFTWARE_POSITIONS,
} from '@/constants/permissions';
import { getUserEffectivePermissions } from '@/lib/permissions';
import { updateUserPermissionsAction } from '@/lib/actions/auth';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { UserWithRole } from '@/types/user';
import {
  IconCheck,
  IconSparkles,
  IconShieldLock,
  IconBriefcase,
  IconUsers,
  IconFileInvoice,
  IconSettings,
} from '@tabler/icons-react';

interface PermissionsDialogProps {
  user: UserWithRole | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionsDialog({ user, isOpen, onClose }: PermissionsDialogProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || 'telecaller');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Initialize or re-sync state when dialog opens or user changes
  const initialEffectivePermissions = user ? getUserEffectivePermissions(user) : [];

  const handleOpenChange = (open: boolean) => {
    if (open && user) {
      const perms = getUserEffectivePermissions(user);
      setSelectedRole(user.role || 'telecaller');
      setSelectedPermissions(perms.includes('*') ? ALL_FEATURE_MODULES.map((m) => m.id) : perms);
    }
    if (!open) {
      onClose();
    }
  };

  const { execute: savePermissions, isExecuting } = useAction(updateUserPermissionsAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        onClose();
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data?.message || 'Failed to save permissions');
      }
    },
    onError: () => {
      toast.error('An error occurred updating permissions. Please try again.');
    },
  });

  if (!user) return null;

  const isSuperAdminRole = selectedRole === 'admin';

  // Toggle single permission
  const handleToggle = (featureId: string) => {
    if (isSuperAdminRole) return; // Super admin always has all

    setSelectedPermissions((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Change position preset
  const handlePositionChange = (positionId: string) => {
    setSelectedRole(positionId);
    const targetPos = SOFTWARE_POSITIONS.find((p) => p.id === positionId);
    if (targetPos) {
      if (targetPos.defaultPermissions.includes('*')) {
        setSelectedPermissions(ALL_FEATURE_MODULES.map((m) => m.id));
      } else {
        setSelectedPermissions([...targetPos.defaultPermissions]);
      }
    }
  };

  // Quick preset actions
  const handleSelectAll = () => {
    setSelectedPermissions(ALL_FEATURE_MODULES.map((m) => m.id));
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleApplyPreset = (positionId: string) => {
    handlePositionChange(positionId);
  };

  const handleSave = () => {
    if (isSuperAdminRole) {
      savePermissions({
        userId: user.id,
        role: 'admin',
        permissions: ['*'],
      });
      return;
    }

    savePermissions({
      userId: user.id,
      role: selectedRole,
      permissions: selectedPermissions,
    });
  };

  const categories: Array<{ id: FeatureModule['category']; label: string; icon: any }> = [
    { id: 'core', label: 'Core & Lead Management', icon: IconUsers },
    { id: 'operations', label: 'Field & Service Operations', icon: IconBriefcase },
    { id: 'finance', label: 'Invoicing & Financials', icon: IconFileInvoice },
    { id: 'admin', label: 'System Administration', icon: IconSettings },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/70 sticky top-0 bg-background/95 backdrop-blur-md z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconShieldLock className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Feature Permissions & Position Access
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Configure active features for <span className="font-semibold text-foreground">{user.name}</span> ({user.email})
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5">
              {isSuperAdminRole
                ? 'Full Access (Admin)'
                : `${selectedPermissions.length} Features Active`}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Position Selection */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned Software Position
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select the team member&apos;s primary CRM role and default workflow position.
                </p>
              </div>
              <Select value={selectedRole} onValueChange={handlePositionChange} disabled={isExecuting}>
                <SelectTrigger className="w-full sm:w-64 h-9 text-xs bg-background">
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  {SOFTWARE_POSITIONS.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id} className="text-xs">
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium text-foreground">{pos.title}</span>
                        <span className="text-[10px] text-muted-foreground">{pos.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
              <span className="text-[11px] font-medium text-muted-foreground mr-1 flex items-center gap-1">
                <IconSparkles className="size-3 text-amber-500" /> Presets:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => handleApplyPreset('job_orders')}
              >
                Job Orders Only
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => handleApplyPreset('enquiries')}
              >
                Enquiries Only
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => handleApplyPreset('services')}
              >
                Services Only
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => handleApplyPreset('accounts')}
              >
                Accounts & Invoicing
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 ml-auto text-primary"
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-muted-foreground"
                onClick={handleClearAll}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Super Admin Notice */}
          {isSuperAdminRole && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 p-3.5 flex items-start gap-3">
              <IconShieldLock className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200">
                <p className="font-semibold">Super Administrator Access Enabled</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-400">
                  This user possesses unrestricted access across all software modules, database records, and user management controls.
                </p>
              </div>
            </div>
          )}

          {/* Module Categories Grid */}
          <div className="space-y-5">
            {categories.map((cat) => {
              const modulesInCat = ALL_FEATURE_MODULES.filter((m) => m.category === cat.id);
              const CatIcon = cat.icon;

              return (
                <div key={cat.id} className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CatIcon className="size-4 text-primary" />
                    <span>{cat.label}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {modulesInCat.map((mod) => {
                      const isChecked =
                        isSuperAdminRole || selectedPermissions.includes(mod.id);

                      return (
                        <div
                          key={mod.id}
                          onClick={() => !isSuperAdminRole && handleToggle(mod.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'border-primary/50 bg-primary/5 shadow-xs'
                              : 'border-border/70 hover:border-border hover:bg-muted/30 opacity-70'
                          } ${isSuperAdminRole ? 'cursor-default' : ''}`}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={isSuperAdminRole || isExecuting}
                            onCheckedChange={() => handleToggle(mod.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {mod.label}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground/80">
                                {mod.defaultPath}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/70 bg-muted/10 sticky bottom-0 z-10 flex flex-row items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Changes take effect immediately upon saving.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isExecuting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isExecuting}
              className="text-xs gap-1.5"
            >
              {isExecuting ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving Permissions...
                </>
              ) : (
                <>
                  <IconCheck className="size-4" />
                  Save Access Permissions
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
