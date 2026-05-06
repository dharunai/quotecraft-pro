import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const modules = [
    { name: 'Home', href: '/dashboard' },
    { name: 'Leads', href: '/leads' },
    { name: 'Deals', href: '/deals' },
    { name: 'Pipeline', href: '/pipeline' },
    { name: 'Quotes', href: '/quotations' },
    { name: 'Invoices', href: '/invoices' },
    { name: 'Products', href: '/products' },
    { name: 'Tasks', href: '/tasks' },
    { name: 'Meetings', href: '/meetings' },
    { name: 'Workflows', href: '/settings/workflows' },
    { name: 'Automation', href: '/settings/automation' },
];

export function TopNav() {
    const location = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const isActive = (href: string) => {
        if (href === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
        return location.pathname === href || location.pathname.startsWith(href + '/');
    };

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, []);

    const scrollBy = (dx: number) => {
        scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
    };

    return (
        <div className="relative border-b border-border bg-card">
            <div className="flex items-center h-11 px-2 md:px-4">
                {canScrollLeft && (
                    <button
                        onClick={() => scrollBy(-200)}
                        className="hidden md:flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                )}
                <div
                    ref={scrollRef}
                    className="flex-1 flex items-stretch gap-1 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {modules.map((m) => {
                        const active = isActive(m.href);
                        return (
                            <Link
                                key={m.href}
                                to={m.href}
                                className={cn(
                                    "relative flex items-center px-3 md:px-4 text-sm font-medium whitespace-nowrap transition-colors",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {m.name}
                                {active && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>
                {canScrollRight && (
                    <button
                        onClick={() => scrollBy(200)}
                        className="hidden md:flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="ml-1 h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                            aria-label="More modules"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {modules.map((m) => (
                            <DropdownMenuItem key={m.href} asChild>
                                <Link to={m.href}>{m.name}</Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
