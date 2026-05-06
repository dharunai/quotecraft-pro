import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { TopNav } from './TopNav';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { LogOut, Settings as SettingsIcon, User, Building2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatars';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { data: settings } = useCompanySettings();
    const companyName = settings?.company_name || 'CRM';

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Brand Header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border">
                <div className="flex items-center h-14 px-3 md:px-6 gap-3">
                    <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                        {settings?.logo_url ? (
                            <img
                                src={settings.logo_url}
                                alt={companyName}
                                className="h-8 w-8 object-contain rounded"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-4 w-4 text-primary-foreground" />
                            </div>
                        )}
                        <span className="font-semibold text-foreground truncate text-sm md:text-base">
                            {companyName}
                        </span>
                    </Link>

                    <div className="flex-1 max-w-xl mx-auto hidden sm:block">
                        <GlobalSearch />
                    </div>

                    <div className="flex items-center gap-1 md:gap-2 ml-auto">
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={getAvatarUrl(user?.email || 'user')} alt={user?.email || 'User'} />
                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                                            {userInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="flex items-center gap-2 p-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={getAvatarUrl(user?.email || 'user')} alt={user?.email || 'User'} />
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
                    </div>
                </div>

                {/* Module Tabs */}
                <TopNav />
            </header>

            {/* Mobile Search */}
            <div className="px-3 py-2 border-b border-border sm:hidden">
                <GlobalSearch />
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 animate-fade-in overflow-x-hidden">
                <div className="max-w-[1600px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
