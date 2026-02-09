import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { LogOut, Menu, User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { data: settings } = useCompanySettings();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Persist sidebar state
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved) setSidebarCollapsed(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar - Desktop */}
            <div className="hidden md:block">
                <AppSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "fixed left-0 top-0 z-50 h-screen w-64 bg-card border-r border-border transform transition-transform duration-300 md:hidden",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <AppSidebar
                    collapsed={false}
                    onToggle={() => setMobileMenuOpen(false)}
                />
            </div>

            {/* Main Content Area */}
            <div className={cn(
                "transition-all duration-300 ease-in-out",
                sidebarCollapsed ? "md:ml-16" : "md:ml-64"
            )}>
                {/* Top Header Bar */}
                <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
                    <div className="flex items-center justify-between h-full px-4 md:px-6">
                        {/* Left - Mobile Menu Button */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-9 w-9"
                                onClick={() => setMobileMenuOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>

                            {/* Company Name on Mobile */}
                            <span className="font-semibold text-foreground md:hidden truncate max-w-[150px]">
                                {settings?.company_name || 'CRM'}
                            </span>
                        </div>

                        {/* Center - Global Search */}
                        <div className="flex-1 max-w-md mx-4 hidden sm:block">
                            <GlobalSearch />
                        </div>

                        {/* Right - Actions */}
                        <div className="flex items-center gap-2">
                            <NotificationBell />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                                                {userInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="flex items-center gap-2 p-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                                {userInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">{user?.email}</span>
                                            <span className="text-xs text-muted-foreground">Account</span>
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                                        <User className="mr-2 h-4 w-4" />
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Mobile Search */}
                <div className="px-4 py-3 border-b border-border sm:hidden">
                    <GlobalSearch />
                </div>

                {/* Main Content */}
                <main className="p-4 md:p-6 animate-fade-in overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
