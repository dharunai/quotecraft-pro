import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const navigation = [{
  name: 'Dashboard',
  href: '/dashboard'
}, {
  name: 'Leads',
  href: '/leads'
}, {
  name: 'Pipeline',
  href: '/pipeline'
}, {
  name: 'Quotations',
  href: '/quotations'
}, {
  name: 'Products',
  href: '/products'
}, {
  name: 'Invoices',
  href: '/invoices'
}, {
  name: 'Settings',
  href: '/settings'
}];
export function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-xl font-semibold text-card-foreground">The GenWorks</Link>
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map(item => <Link key={item.name} to={item.href} className={cn("px-3 py-2 text-sm font-medium rounded-md transition-colors bg-muted-foreground text-destructive-foreground", location.pathname.startsWith(item.href) ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                  {item.name}
                </Link>)}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden border-b border-border bg-card px-4 py-2 flex gap-2 overflow-x-auto">
        {navigation.map(item => <Link key={item.name} to={item.href} className={cn('px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors', location.pathname.startsWith(item.href) ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
            {item.name}
          </Link>)}
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>;
}