'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCirclePlusFilled } from '@tabler/icons-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types/navigation';
import { navigation } from '@/config/app';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';


interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {navigation.showQuickCreate && (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                tooltip="Quick Create"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              >
                <IconCirclePlusFilled />
                <span>Quick Create</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isItemActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url));

            return (
              <SidebarMenuItem key={item.title}>
                {item.items && item.items.length > 0 ? (
                  <Collapsible
                    asChild
                    defaultOpen={item.isActive || isItemActive}
                    className="group/collapsible"
                  >
                    <div>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isItemActive}
                          className="font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                        >
                          {item.icon && <item.icon className="size-4.5 shrink-0 opacity-80" />}
                          <span className="text-sm">{item.title}</span>
                          {item.badge ? (
                            <span className="ml-auto mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30">
                              {item.badge}
                            </span>
                          ) : null}
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 opacity-60" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-5 pl-2 border-l border-sidebar-border/70 my-1 space-y-0.5">
                          {item.items.map((subItem) => {
                            const isSubActive = pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className="text-xs font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground data-[active=true]:font-semibold data-[active=true]:text-primary"
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                    {subItem.badge ? (
                                      <span className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30">
                                        {subItem.badge}
                                      </span>
                                    ) : null}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isItemActive}
                    className="font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon className="size-4.5 shrink-0 opacity-80" />}
                      <span className="text-sm">{item.title}</span>
                      {item.badge ? (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
