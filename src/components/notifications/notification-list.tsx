'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    getNotifications,
    markAllAsRead,
    markAsRead,
} from '@/server/actions/notification';
import { NotificationItem } from './notification-item';
import { NotificationType } from '@prisma/client';

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface NotificationListProps {
    onOpenChange?: (open: boolean) => void;
}

export function NotificationList({ onOpenChange }: NotificationListProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const result = await getNotifications();
            if (result.success && result.data) {
                setNotifications(result.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );

        await markAsRead(id);
        router.refresh(); // Refresh server components if needed
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

        await markAllAsRead();
        router.refresh();
    };

    const handleLinkClick = () => {
        if (onOpenChange) {
            onOpenChange(false);
        }
    }

    if (loading) {
        return <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="flex w-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="font-semibold">Notifications</h4>
                {notifications.some((n) => !n.isRead) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={handleMarkAllAsRead}
                    >
                        Mark all as read
                    </Button>
                )}
            </div>
            <ScrollArea className="h-75">
                {notifications.length === 0 ? (
                    <div className="flex h-50 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Bell className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No notifications</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onLinkClick={handleLinkClick}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
