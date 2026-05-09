import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { LogOut, Settings as SettingsIcon, Menu, PanelLeft, PanelTop, X, Building2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

type NavMode = 'sidebar' | 'topnav';

function getStoredNavMode(): NavMode {
    try {
        const stored = localStorage.getItem('crm-nav-mode');
        if (stored === 'topnav') return 'topnav';
    } catch {}
    return 'sidebar'; // default
}

export function AppLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { data: settings } = useCompanySettings();
    const companyName = settings?.company_name || 'CRM';

    const [navMode, setNavMode] = useState<NavMode>(getStoredNavMode);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // collapsed by default
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const switchNavMode = (mode: NavMode) => {
        setNavMode(mode);
        localStorage.setItem('crm-nav-mode', mode);
        setMobileOpen(false);
    };

    const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

    // ── User dropdown (shared between both layouts) ──
    const userMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(user?.email || 'user')} alt={user?.email || 'User'} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(user?.email || 'user')} alt={user?.email || 'User'} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate">{user?.email}</span>
                        <span className="text-[10px] text-muted-foreground">Account</span>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">Navigation Layout</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => switchNavMode('sidebar')} className={navMode === 'sidebar' ? 'bg-accent' : ''}>
                    <PanelLeft className="mr-2 h-4 w-4" />
                    Sidebar View
                    {navMode === 'sidebar' && <span className="ml-auto text-xs text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchNavMode('topnav')} className={navMode === 'topnav' ? 'bg-accent' : ''}>
                    <PanelTop className="mr-2 h-4 w-4" />
                    Top Nav View
                    {navMode === 'topnav' && <span className="ml-auto text-xs text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    // ═══════════════════════════════════════════════════════════
    // TOP NAV MODE
    // ═══════════════════════════════════════════════════════════
    if (navMode === 'topnav') {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <header className="sticky top-0 z-40 bg-card border-b border-border">
                    <div className="flex items-center h-14 px-3 md:px-6 gap-3">
                        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                            {settings?.logo_url ? (
                                <img src={settings.logo_url} alt={companyName} className="h-8 w-8 object-contain rounded" />
                            ) : (
                                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                                    <Building2 className="h-4 w-4 text-primary-foreground" />
                                </div>
                            )}
                            <span className="font-semibold text-foreground truncate text-xs md:text-sm">{companyName}</span>
                        </Link>
                        <div className="flex-1 max-w-xl mx-auto hidden sm:block">
                            <GlobalSearch />
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 ml-auto">
                            <NotificationBell />
                            {userMenu}
                        </div>
                    </div>
                    <TopNav />
                </header>
                <div className="px-3 py-2 border-b border-border sm:hidden">
                    <GlobalSearch />
                </div>
                <main className="flex-1 p-4 md:p-6 animate-fade-in overflow-x-hidden">
                    <div className="max-w-[1600px] mx-auto w-full">{children}</div>
                </main>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // SIDEBAR MODE (default)
    // ═══════════════════════════════════════════════════════════
    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background flex">
                {/* Mobile overlay backdrop */}
                {mobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-40 md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}

                {/* Sidebar — on desktop: inline, on mobile: slide-over overlay */}
                <div className={cn(
                    // Mobile: fixed overlay
                    "fixed top-0 left-0 z-50 h-screen transition-transform duration-300 md:transition-none",
                    mobileOpen ? "translate-x-0" : "-translate-x-full",
                    // Desktop: always visible, no transform
                    "md:translate-x-0 md:z-auto md:relative md:block"
                )}>
                    <AppSidebar
                        collapsed={sidebarCollapsed}
                        onToggle={() => {
                            setSidebarCollapsed(!sidebarCollapsed);
                            if (mobileOpen) setMobileOpen(false);
                        }}
                    />
                </div>

                {/* Main area */}
                <div className={cn(
                    "flex-1 flex flex-col min-h-screen transition-all duration-300",
                    // On desktop, offset by sidebar width
                    sidebarCollapsed ? "md:ml-16" : "md:ml-64",
                    // On mobile, no margin (sidebar is overlay)
                    "ml-0"
                )}>
                    {/* Top bar */}
                    <header className="sticky top-0 z-30 bg-card border-b border-border">
                        <div className="flex items-center h-14 px-4 md:px-6 gap-3">
                            {/* Mobile hamburger */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-9 w-9"
                                onClick={() => setMobileOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>

                            <div className="flex-1 max-w-xl">
                                <GlobalSearch />
                            </div>

                            <div className="flex items-center gap-1 md:gap-2 ml-auto">
                                <NotificationBell />
                                {userMenu}
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 p-4 md:p-6 animate-fade-in overflow-x-hidden">
                        <div className="max-w-[1600px] mx-auto w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
