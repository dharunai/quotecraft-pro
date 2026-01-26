// Notification System - Placeholder
// This uses the activities table instead of a dedicated notifications table

import { logActivity } from './activityLogger';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'deal' | 'task' | 'payment' | 'stock' | 'system';

interface CreateNotificationParams {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    category?: NotificationCategory;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
}

export async function createNotification({
    userId,
    title,
    message,
    type = 'info',
    category,
    entityType,
    entityId,
}: CreateNotificationParams) {
    try {
        // Log as activity instead
        if (entityType && entityId) {
            await logActivity({
                entityType: entityType as any,
                entityId,
                action: category || 'notification',
                description: `${title}: ${message}`,
                userId,
            });
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}
