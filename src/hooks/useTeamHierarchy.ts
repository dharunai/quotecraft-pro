import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    company_id: string | null;
    position: string | null;
    department_id: string | null;
    reports_to: string | null;
    hierarchy_level: number | null;
    can_assign_tasks: boolean | null;
    can_view_all_tasks: boolean | null;
}

export function useTeamHierarchy() {
    const { user } = useAuth();

    const { data: allProfiles = [], isLoading: profilesLoading } = useQuery({
        queryKey: ['profiles-hierarchy'],
        queryFn: async (): Promise<Profile[]> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');
            if (error) throw error;
            return (data || []) as Profile[];
        },
    });

    const currentProfile = allProfiles.find(p => p.user_id === user?.id) || null;

    // Get all subordinates recursively (people who report to this user, and their reports, etc.)
    function getSubordinates(profileId: string, visited = new Set<string>()): Profile[] {
        if (visited.has(profileId)) return [];
        visited.add(profileId);

        const directReports = allProfiles.filter(p => p.reports_to === profileId);
        const allSubordinates: Profile[] = [...directReports];

        for (const report of directReports) {
            allSubordinates.push(...getSubordinates(report.id, visited));
        }

        return allSubordinates;
    }

    // Get profiles that the current user can assign tasks to
    function getAssignableProfiles(): Profile[] {
        if (!currentProfile) return [];

        const level = currentProfile.hierarchy_level ?? 2;

        // Owner (level 0) → can assign to anyone
        if (level === 0) {
            return allProfiles;
        }

        // Manager (level 1) → can assign to direct reports + same department
        if (level === 1) {
            const subordinates = getSubordinates(currentProfile.id);
            const sameDepartment = currentProfile.department_id
                ? allProfiles.filter(p => p.department_id === currentProfile.department_id)
                : [];

            const uniqueMap = new Map<string, Profile>();
            // Always include self
            uniqueMap.set(currentProfile.id, currentProfile);
            subordinates.forEach(p => uniqueMap.set(p.id, p));
            sameDepartment.forEach(p => uniqueMap.set(p.id, p));

            return Array.from(uniqueMap.values());
        }

        // Team Member (level 2) → self only, unless can_assign_tasks is true
        if (currentProfile.can_assign_tasks) {
            // If they have assignment permission, treat like manager
            const subordinates = getSubordinates(currentProfile.id);
            const sameDepartment = currentProfile.department_id
                ? allProfiles.filter(p => p.department_id === currentProfile.department_id)
                : [];

            const uniqueMap = new Map<string, Profile>();
            uniqueMap.set(currentProfile.id, currentProfile);
            subordinates.forEach(p => uniqueMap.set(p.id, p));
            sameDepartment.forEach(p => uniqueMap.set(p.id, p));

            return Array.from(uniqueMap.values());
        }

        // Default: self only
        return [currentProfile];
    }

    function canCurrentUserAssign(): boolean {
        if (!currentProfile) return false;
        const level = currentProfile.hierarchy_level ?? 2;
        return level <= 1 || currentProfile.can_assign_tasks === true;
    }

    function getMySubordinateIds(): string[] {
        if (!currentProfile) return [];
        return getSubordinates(currentProfile.id).map(p => p.id);
    }

    return {
        allProfiles,
        currentProfile,
        profilesLoading,
        getAssignableProfiles,
        canCurrentUserAssign,
        getSubordinates: () => currentProfile ? getSubordinates(currentProfile.id) : [],
        getMySubordinateIds,
    };
}
