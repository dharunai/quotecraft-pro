import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Filter as FilterIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function useFilters<T extends Record<string, any>>(initialFilters?: T) {
    const [searchParams, setSearchParams] = useSearchParams();

    const getFilter = useCallback((key: string) => {
        return searchParams.get(key);
    }, [searchParams]);

    const getFilters = useCallback(() => {
        const filters: any = {};
        for (const [key, value] of searchParams.entries()) {
            filters[key] = value;
        }
        return filters as T;
    }, [searchParams]);

    const setFilter = useCallback((key: string, value: string | null) => {
        setSearchParams(prev => {
            if (value === null || value === '') {
                prev.delete(key);
            } else {
                prev.set(key, value);
            }
            return prev;
        });
    }, [setSearchParams]);

    const clearFilters = useCallback(() => {
        setSearchParams({});
    }, [setSearchParams]);

    const activeCount = Array.from(searchParams.keys()).length;

    return {
        getFilter,
        getFilters,
        setFilter,
        clearFilters,
        activeCount,
        searchParams
    };
}

interface FilterPanelProps {
    title?: string;
    description?: string;
    activeCount?: number;
    onClear?: () => void;
    children: React.ReactNode;
}

export function FilterPanel({ title = "Filters", description = "Refine your results", activeCount = 0, onClear, children }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                    <FilterIcon className="h-4 w-4" />
                    Filter
                    {activeCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {activeCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    {children}
                </div>

                <SheetFooter className="flex-col gap-2 sm:flex-col">
                    <Button onClick={() => setIsOpen(false)}>View Results</Button>
                    {activeCount > 0 && (
                        <Button variant="ghost" onClick={() => { onClear?.(); setIsOpen(false); }}>
                            Clear All Filters
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

export function FilterSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium">{title}</h3>
            {children}
            <Separator className="mt-4" />
        </div>
    );
}
