// src/components/user-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema } from '@/schema/user-schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ErrorMessage } from '@/components/ui/error-message';
import type { UserFormProps, UserFormData } from '@/types/user';
import { createUserAction } from '@/lib/actions/auth';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import {
  SOFTWARE_POSITIONS,
  ALL_FEATURE_MODULES,
  FeatureModule,
} from '@/constants/permissions';
import {
  IconShieldLock,
  IconSparkles,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';

type CreateUserFormData = UserFormData;

export function UserForm({ roles, branches, onSuccess, initialData }: UserFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      confirmPassword: '',
      role: initialData?.role || 'enquiries',
      branch: initialData?.branch || '',
      permissions: initialData?.permissions || [],
    },
  });

  const selectedRole = form.watch('role');

  // Synchronize permissions when role/position changes
  useEffect(() => {
    if (selectedRole) {
      const pos = SOFTWARE_POSITIONS.find((p) => p.id === selectedRole);
      if (pos) {
        if (pos.defaultPermissions.includes('*')) {
          setSelectedPermissions(ALL_FEATURE_MODULES.map((m) => m.id));
        } else {
          setSelectedPermissions([...pos.defaultPermissions]);
        }
      }
    }
  }, [selectedRole]);

  // Keep form permissions value synced
  useEffect(() => {
    form.setValue('permissions', selectedPermissions);
  }, [selectedPermissions, form]);

  const { execute, isExecuting } = useAction(createUserAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message || 'User created successfully');
        form.reset();
        setFormError(null);
        if (onSuccess) {
          onSuccess();
        }
      }
    },
    onError: (error) => {
      console.error('Action error:', error);
      setFormError('An unexpected error occurred creating user');
    },
  });

  const submit = async (data: CreateUserFormData) => {
    setFormError(null);
    execute({
      ...data,
      permissions: selectedRole === 'admin' ? ['*'] : selectedPermissions,
    });
  };

  const handleTogglePermission = (permId: string) => {
    if (selectedRole === 'admin') return;
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const isSuperAdmin = selectedRole === 'admin';

  return (
    <div className="space-y-4">
      {formError && <ErrorMessage message={formError} />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      type="text"
                      autoComplete="name"
                      disabled={isExecuting}
                      className="h-8 text-xs bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. rahul@willowycrm.com"
                      type="email"
                      autoComplete="email"
                      disabled={isExecuting}
                      className="h-8 text-xs bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Min 8 characters"
                      type="password"
                      autoComplete="new-password"
                      disabled={isExecuting}
                      className="h-8 text-xs bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Re-enter password"
                      type="password"
                      autoComplete="new-password"
                      disabled={isExecuting}
                      className="h-8 text-xs bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Position / Role Selector */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Software Position</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isExecuting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-8 text-xs bg-background">
                        <SelectValue placeholder="Select Position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOFTWARE_POSITIONS.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id} className="text-xs cursor-pointer">
                          <div className="flex flex-col py-0.5">
                            <span className="font-semibold text-foreground">{pos.title}</span>
                            <span className="text-[10px] text-muted-foreground">{pos.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Branch Selector */}
            <FormField
              control={form.control}
              name="branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Branch Office</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isExecuting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-8 text-xs bg-background">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id} className="text-xs cursor-pointer">
                          <span className="font-medium">{branch.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />
          </div>

          {/* Collapsible Feature Permissions Checklist */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IconShieldLock className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Module Permissions
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1">
                  {isSuperAdmin ? 'All 13 Modules (Admin)' : `${selectedPermissions.length} Active`}
                </Badge>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10 gap-1 font-medium"
              >
                {showAdvancedPerms ? (
                  <>
                    Hide Features <IconChevronUp className="size-3" />
                  </>
                ) : (
                  <>
                    Customize Features <IconChevronDown className="size-3" />
                  </>
                )}
              </Button>
            </div>

            {/* Feature Checklists */}
            {showAdvancedPerms && (
              <div className="pt-2 space-y-2 border-t border-border/60 max-h-56 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_FEATURE_MODULES.map((mod) => {
                    const isChecked = isSuperAdmin || selectedPermissions.includes(mod.id);

                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleTogglePermission(mod.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-primary/50 bg-primary/5 font-medium text-foreground'
                            : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isSuperAdmin || isExecuting}
                          onCheckedChange={() => handleTogglePermission(mod.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs">{mod.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{mod.defaultPath}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isExecuting} className="w-full text-xs font-semibold">
              {isExecuting ? 'Provisioning Account...' : 'Create Team Account'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
