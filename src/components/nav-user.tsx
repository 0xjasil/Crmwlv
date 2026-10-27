'use client';

import { useState } from 'react';
import { IconDotsVertical, IconLogout, IconUserCircle } from '@tabler/icons-react';
import { useAction } from 'next-safe-action/hooks';
import { logoutAction } from '@/lib/actions/auth';
import Link from 'next/link';
import { ProfileDialog } from '@/components/profile/profile-dialog';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { getInitials } from '@/lib/utils';
import type { UserProfile } from '@/types/navigation';
import { getPositionDefinition } from '@/lib/permissions';

interface NavUserProps {
  user: UserProfile & { role?: string | null };
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { execute: executeLogout, isExecuting: isLoggingOut } = useAction(logoutAction);

  const initials = getInitials(user.name);
  const position = getPositionDefinition(user.role);

  const handleLogout = () => {
    executeLogout();
  };

  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <>
      <ProfileDialog
        user={user}
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-semibold text-xs">{user.name}</span>
                  </div>
                  <span className="text-[11px] text-primary font-medium truncate">
                    {position.shortTitle}
                  </span>
                  <span className="text-muted-foreground truncate text-[10px]">{user.email}</span>
                </div>
                <IconDotsVertical className="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div
                  className="flex items-center gap-2 px-2 py-2 text-left text-sm cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
                  onClick={() => setShowProfileModal(true)}
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image || undefined} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-semibold text-xs">{user.name}</span>
                    <span className="text-[11px] font-medium text-primary truncate">
                      {position.title}
                    </span>
                    <span className="text-muted-foreground truncate text-[10px]">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setShowProfileModal(true)}
                  className="cursor-pointer"
                >
                  <IconUserCircle />
                  Account & Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer"
              >
                <IconLogout />
                {isLoggingOut ? 'Signing out...' : 'Log out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
