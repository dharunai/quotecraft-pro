import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Handshake,
    GitBranch,
    FileText,
    Package,
    Receipt,
    Zap,
    Settings,
    ChevronLeft,
    ChevronRight,
    Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Deals', href: '/deals', icon: Handshake },
    { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Automation', href: '/settings/automation', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
];

interface AppSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
    const location = useLocation();
    const { data: settings } = useCompanySettings();
    const companyName = settings?.company_name || 'CRM';

    const isActive = (href: string) => {
        if (href === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(href);
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo Area */}
            <div className={cn(
                "h-16 flex items-center border-b border-border px-4",
                collapsed ? "justify-center" : "justify-between"
            )}>
                {!collapsed ? (
                    <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                        {settings?.logo_url ? (
                            <img 
                                src={settings.logo_url} 
                                alt={companyName} 
                                className="h-8 w-8 object-contain rounded"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-5 w-5 text-primary-foreground" />
                            </div>
                        )}
                        <span className="font-semibold text-foreground truncate">
                            {companyName}
                        </span>
                    </Link>
                ) : (
                    <Link to="/dashboard">
                        {settings?.logo_url ? (
                            <img 
                                src={settings.logo_url} 
                                alt={companyName} 
                                className="h-8 w-8 object-contain rounded"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary-foreground" />
                            </div>
                        )}
                    </Link>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn(
                        "h-8 w-8 rounded-full hover:bg-accent transition-colors flex-shrink-0",
                        collapsed && "absolute -right-3 top-6 bg-card border border-border shadow-sm"
                    )}
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
                <nav className="px-2 space-y-1">
                    {navigation.map((item) => {
                        const active = isActive(item.href);
                        const navItem = (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    active
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                                    collapsed && "justify-center px-2"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 flex-shrink-0", active && "animate-fade-in")} />
                                {!collapsed && (
                                    <span className="truncate">{item.name}</span>
                                )}
                            </Link>
                        );

                        if (collapsed) {
                            return (
                                <Tooltip key={item.name} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        {navItem}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="font-medium">
                                        {item.name}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return navItem;
                    })}
                </nav>
            </ScrollArea>

            {/* Version Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                        CRM v1.0
                    </p>
                </div>
            )}
        </aside>
    );
}
