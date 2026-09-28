'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationList } from './notification-list';
import { getNotifications } from '@/server/actions/notification';

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    // Poll for unread count every 30 seconds
    useEffect(() => {
        const fetchCount = async () => {
            const result = await getNotifications();
            if (result.success && typeof result.unreadCount === 'number') {
                setUnreadCount(result.unreadCount);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [open]); // Also refetch when closed/opened

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-1 ring-background">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
                <NotificationList onOpenChange={setOpen} />
            </PopoverContent>
        </Popover>
    );
}
