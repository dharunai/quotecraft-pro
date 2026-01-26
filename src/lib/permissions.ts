import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'user';

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
    user: [
        'create', 'read', 'update',
        'send_email', 'export_data'
    ],
};

export async function checkPermission(userId: string, action: PermissionAction): Promise<boolean> {
    try {
        // Use the user_roles table from the actual schema
        const { data: userRole, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

        // Default to admin in dev or if no role found (first user)
        if (error || !userRole) {
            if (import.meta.env.DEV) {
                console.warn('Permissions Bypass: Defaulting to ADMIN for development/testing.');
                return ROLE_PERMISSIONS['admin'].includes(action);
            }
            // Check if user has admin role via RPC
            const { data: hasAdmin } = await supabase.rpc('has_role', { 
                _role: 'admin', 
                _user_id: userId 
            });
            if (hasAdmin) {
                return ROLE_PERMISSIONS['admin'].includes(action);
            }
            return ROLE_PERMISSIONS['user'].includes(action);
        }

        const role = userRole.role as UserRole;
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
        staleTime: 5 * 60 * 1000,
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
                .from('user_roles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && import.meta.env.DEV) {
                console.warn('Role Bypass: Defaulting to ADMIN for development/testing.');
                return { role: 'admin' as const };
            }
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
}
