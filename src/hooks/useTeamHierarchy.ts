import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
}

export function useTeamHierarchy() {
    const { user } = useAuth();

    const { data: allProfiles = [], isLoading: profilesLoading } = useQuery({
        queryKey: ['profiles-hierarchy'],
        queryFn: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, user_id, full_name, email');
            if (error) throw error;
            return (data || []) as Profile[];
        },
    });

    const currentProfile = allProfiles.find(p => p.user_id === user?.id) || null;

    function getAssignableProfiles(): Profile[] {
        return allProfiles;
    }

    function canCurrentUserAssign(): boolean {
        return !!currentProfile;
    }

    return {
        allProfiles,
        currentProfile,
        profilesLoading,
        getAssignableProfiles,
        canCurrentUserAssign,
        getSubordinates: () => [] as Profile[],
        getMySubordinateIds: () => [] as string[],
    };
}
