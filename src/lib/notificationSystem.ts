import { supabase } from '@/integrations/supabase/client';

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
    actionUrl
}: CreateNotificationParams) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                category,
                entity_type: entityType,
                entity_id: entityId,
                action_url: actionUrl
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}
