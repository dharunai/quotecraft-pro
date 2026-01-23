import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'sales' | 'viewer';

export type PermissionAction =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'manage_team'
    | 'manage_settings'
    | 'send_email'
    | 'export_data';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
    admin: [
        'create', 'read', 'update', 'delete',
        'manage_team', 'manage_settings', 'send_email', 'export_data'
    ],
    sales: [
        'create', 'read', 'update',
        'send_email', 'export_data'
    ],
    viewer: [
        'read', 'export_data'
    ]
};

export async function checkPermission(userId: string, action: PermissionAction): Promise<boolean> {
    try {
        const { data: member, error } = await supabase
            .from('team_members')
            .select('role, is_active')
            .eq('user_id', userId)
            .maybeSingle();

        // If no team member record, assume they are not a team member yet or just a raw authenticated user.
        // For now, if no record, deny all except maybe read if we want public read? No, default deny.
        // However, the migration attempts to make the first user admin.
        if ((error || !member) && import.meta.env.DEV) {
            console.warn('Permissions Bypass: Defaulting to ADMIN for development/testing.');
            return ROLE_PERMISSIONS['admin'].includes(action);
        }

        if (error || !member || !member.is_active) {
            return false;
        }

        const role = member.role as UserRole;
        return ROLE_PERMISSIONS[role]?.includes(action) || false;
    } catch (err) {
        console.error('Error checking permission:', err);
        return false;
    }
}

export function usePermission(action: PermissionAction) {
    const { user } = useAuth();

    const { data: hasPermission = false, isLoading } = useQuery({
        queryKey: ['permission', user?.id, action],
        queryFn: async () => {
            if (!user) return false;
            return checkPermission(user.id, action);
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    return { hasPermission, isLoading };
}

export function useUserRole() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['userRole', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && import.meta.env.DEV) {
                console.warn('Role Bypass: Defaulting to ADMIN for development/testing.');
                return { role: 'admin', is_active: true } as any;
            }
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
}
