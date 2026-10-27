'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProfileForm } from './profile-form';
import { ChangePasswordForm } from './change-password-form';
import { getInitials } from '@/lib/utils';
import { getPositionDefinition } from '@/lib/permissions';
import { ALL_FEATURE_MODULES, FeatureModule } from '@/constants/permissions';
import {
  IconUser,
  IconLock,
  IconShieldLock,
  IconBuildingStore,
  IconCheck,
} from '@tabler/icons-react';

interface ProfileDialogProps {
  user: {
    id?: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
    branch?: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function ProfileDialog({
  user,
  open,
  onOpenChange,
  children,
}: ProfileDialogProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile');
  const initials = getInitials(user.name);
  const position = getPositionDefinition(user.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl gap-0 border shadow-2xl">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold truncate text-foreground">{user.name}</h3>
                <Badge variant="default" className="text-xs font-semibold uppercase tracking-wider">
                  {position.title}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>

              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border">
                  <IconBuildingStore className="size-3.5" />
                  {user.branch || 'Head Office / Main Branch'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="w-full flex flex-col"
        >
          <div className="px-6 pt-3 border-b bg-muted/20">
            <TabsList className="bg-transparent h-10 p-0 gap-6">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1 pb-3 text-xs font-semibold gap-1.5"
              >
                <IconUser className="size-4" />
                Personal Details
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1 pb-3 text-xs font-semibold gap-1.5"
              >
                <IconLock className="size-4" />
                Password & Security
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1 pb-3 text-xs font-semibold gap-1.5"
              >
                <IconShieldLock className="size-4" />
                Permissions & Role
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <TabsContent value="profile" className="m-0 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Edit Account Profile</h4>
                <p className="text-xs text-muted-foreground">
                  Update your contact email and display name across CRM actions.
                </p>
              </div>
              <Separator />
              <ProfileForm user={{ name: user.name, email: user.email }} />
            </TabsContent>

            <TabsContent value="security" className="m-0 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Change Password</h4>
                <p className="text-xs text-muted-foreground">
                  Ensure your account is using a secure, long password.
                </p>
              </div>
              <Separator />
              <ChangePasswordForm />
            </TabsContent>

            <TabsContent value="permissions" className="m-0 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Assigned Software Position</h4>
                <p className="text-xs text-muted-foreground">{position.description}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Features & Permissions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FEATURE_MODULES.map((mod: FeatureModule) => {
                    const hasAccess =
                      position.defaultPermissions.includes('*') ||
                      position.defaultPermissions.includes(mod.id);

                    return (
                      <div
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                          hasAccess
                            ? 'bg-primary/5 border-primary/20 text-foreground font-medium'
                            : 'opacity-40 bg-muted/30 border-muted line-through text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`size-4 rounded-full flex items-center justify-center shrink-0 ${
                            hasAccess
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <IconCheck className="size-2.5" />
                        </span>
                        <span className="truncate">{mod.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
