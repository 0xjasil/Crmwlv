'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Helper function to create notification (Internal Use)
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    link?: string | null
) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link,
            },
        });
        // No revalidatePath here as this is usually called deeply nested. 
        // The consumer might want to revalidate if needed, or specific paths.
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Get Notifications for current user
export async function getNotifications() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20, // Limit to recent 20
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                isRead: false,
            },
        });

        return {
            success: true,
            data: notifications,
            unreadCount,
        };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return { success: false, message: 'Failed to fetch notifications' };
    }
}

// Mark single notification as read
export async function markAsRead(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        await prisma.notification.update({
            where: {
                id,
                userId: session.user.id, // Ensure ownership
            },
            data: {
                isRead: true,
            },
        });

        revalidatePath('/'); // Revalidate globally to update header counts
        return { success: true, message: 'Marked as read' };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, message: 'Failed to mark as read' };
    }
}

// Mark all as read
export async function markAllAsRead() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        await prisma.notification.updateMany({
            where: {
                userId: session.user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        revalidatePath('/');
        return { success: true, message: 'All marked as read' };
    } catch (error) {
        console.error('Error marking all as read:', error);
        return { success: false, message: 'Failed to mark all as read' };
    }
}
