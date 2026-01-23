import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, FileText, User, DollarSign, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHotkeys } from 'react-hotkeys-hook';

interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    type: 'lead' | 'quotation' | 'invoice' | 'product';
    url: string;
}

export function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const navigate = useNavigate();

    // Handle keyboard shortcut Cmd+K
    useHotkeys('meta+k, ctrl+k', (e) => {
        e.preventDefault();
        setIsOpen(true);
    });

    // Simple debounce
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: results, isLoading } = useQuery({
        queryKey: ['global_search', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) return [];

            const searchTerm = `%${debouncedQuery}%`;
            const allResults: SearchResult[] = [];

            // Search Leads
            const { data: leads } = await supabase
                .from('leads')
                .select('id, company_name, contact_name')
                .or(`company_name.ilike.${searchTerm},contact_name.ilike.${searchTerm}`)
                .limit(3);

            leads?.forEach(lead => allResults.push({
                id: lead.id,
                title: lead.company_name,
                subtitle: lead.contact_name,
                type: 'lead',
                url: `/leads/${lead.id}`
            }));

            // Search Quotations
            const { data: quotes } = await supabase
                .from('quotations')
                .select(`id, quote_number, total, leads(company_name)`)
                .ilike('quote_number', searchTerm)
                .limit(3);

            quotes?.forEach((quote: any) => allResults.push({
                id: quote.id,
                title: quote.quote_number,
                subtitle: `${quote.leads?.company_name} • ₹${quote.total}`,
                type: 'quotation',
                url: `/quotations/${quote.id}`
            }));

            // Search Invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select(`id, invoice_number, grand_total, leads(company_name)`)
                .ilike('invoice_number', searchTerm)
                .limit(3);

            invoices?.forEach((invoice: any) => allResults.push({
                id: invoice.id,
                title: invoice.invoice_number,
                subtitle: `${invoice.leads?.company_name} • ₹${invoice.grand_total}`,
                type: 'invoice',
                url: `/invoices/${invoice.id}`
            }));

            // Search Products
            const { data: products } = await supabase
                .from('products')
                .select('id, name, sku, unit_price')
                .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
                .limit(3);

            products?.forEach(product => allResults.push({
                id: product.id,
                title: product.name,
                subtitle: `SKU: ${product.sku} • ₹${product.unit_price}`,
                type: 'product',
                url: '/products' // No product detail page yet really
            }));

            return allResults;
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 0 // Always fetch fresh
    });

    const handleSelect = (url: string) => {
        setIsOpen(false);
        navigate(url);
    };

    const getIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'lead': return <User className="h-4 w-4" />;
            case 'quotation': return <FileText className="h-4 w-4" />;
            case 'invoice': return <DollarSign className="h-4 w-4" />;
            case 'product': return <Package className="h-4 w-4" />;
        }
    };

    return (
        <>
            <div className="relative w-full max-w-sm hidden md:block">
                <div
                    className="relative flex items-center w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors cursor-text text-muted-foreground hover:bg-accent/50"
                    onClick={() => setIsOpen(true)}
                >
                    <Search className="h-4 w-4 mr-2 opacity-50" />
                    <span>Search...</span>
                    <kbd className="pointer-events-none absolute right-2 top-[50%] -translate-y-[50%] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsOpen(true)}
            >
                <Search className="h-5 w-5" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-lg">
                    <div className="flex items-center border-b px-3 h-14">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type to search..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <ScrollArea className="max-h-[300px]">
                        {isLoading && (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                            </div>
                        )}
                        {!isLoading && results?.length === 0 && debouncedQuery.length >= 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No results found.
                            </div>
                        )}
                        {results && results.length > 0 && (
                            <div className="p-2 space-y-1">
                                {results.map((result) => (
                                    <div
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleSelect(result.url)}
                                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <div className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-md border",
                                            result.type === 'lead' && "bg-blue-50 text-blue-700 border-blue-200",
                                            result.type === 'quotation' && "bg-orange-50 text-orange-700 border-orange-200",
                                            result.type === 'invoice' && "bg-green-50 text-green-700 border-green-200",
                                            result.type === 'product' && "bg-purple-50 text-purple-700 border-purple-200",
                                        )}>
                                            {getIcon(result.type)}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="truncate font-medium">{result.title}</p>
                                            <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                                        </div>
                                        <div className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                                            {result.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!debouncedQuery && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Search leads, quotes, invoices, and products.
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}
