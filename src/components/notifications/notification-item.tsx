'use client';

import { formatDistanceToNow } from 'date-fns';
import { Bell, Briefcase, Calendar, Check, Info, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationType } from '@prisma/client';

export interface NotificationItemProps {
    notification: {
        id: string;
        title: string;
        message: string;
        type: NotificationType;
        link?: string | null;
        isRead: boolean;
        createdAt: Date;
    };
    onMarkAsRead: (id: string) => void;
    onLinkClick: () => void;
}

export function NotificationItem({
    notification,
    onMarkAsRead,
    onLinkClick,
}: NotificationItemProps) {
    const Icon = getIcon(notification.type);

    return (
        <div
            className={cn(
                'relative flex gap-4 border-b p-4 last:border-0 hover:bg-muted/50',
                !notification.isRead && 'bg-muted/30'
            )}
        >
            <div className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium leading-none", !notification.isRead && "font-bold text-primary")}>
                        {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                        })}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>
                <div className="item-center flex gap-2 pt-2">
                    {!notification.isRead && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:text-primary/80"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(notification.id);
                            }}
                        >
                            Mark as read
                        </Button>
                    )}
                    {notification.link && (
                        <Link
                            href={notification.link}
                            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                            onClick={onLinkClick}
                        >
                            View details
                        </Link>
                    )}
                </div>
            </div>
            {!notification.isRead && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2 rounded-full bg-primary" />
            )}
        </div>
    );
}

function getIcon(type: NotificationType) {
    switch (type) {
        case 'ENQUIRY_ASSIGNED':
            return UserPlus;
        case 'JOB_ORDER_ASSIGNED':
            return Briefcase;
        case 'FOLLOW_UP_ASSIGNED':
            return Calendar;
        default:
            return Bell;
    }
}
