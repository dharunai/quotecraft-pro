import React from 'react';
import { PermissionAction, usePermission, useUserRole } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
    action?: PermissionAction;
    requireAdmin?: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showLoading?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    action,
    requireAdmin,
    children,
    fallback = null,
    showLoading = false
}) => {
    const { hasPermission, isLoading: permissionLoading } = usePermission(action || 'read');
    const { data: roleData, isLoading: roleLoading } = useUserRole();

    if (showLoading && (permissionLoading || roleLoading)) {
        return <Skeleton className="h-10 w-full" />;
    }

    if (requireAdmin) {
        if (roleData?.role === 'admin') {
            return <>{children}</>;
        }
        return <>{fallback}</>;
    }

    if (action) {
        if (hasPermission) {
            return <>{children}</>;
        }
        return <>{fallback}</>;
    }

    // If no specific checks, render children (shouldn't happen with correct usage but safe default)
    return <>{children}</>;
};
