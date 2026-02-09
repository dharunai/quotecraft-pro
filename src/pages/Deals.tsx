import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDeals, useDeleteDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Plus, Trash2, Eye, Download, Upload, TrendingUp } from 'lucide-react';
import { useFilters, FilterPanel, FilterSection } from '@/components/ui/filter-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBulkActions } from '@/hooks/useBulkActions';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { exportToCSV, exportToExcel, flattenData } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Deals() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: deals = [], isLoading } = useDeals();
    const { data: settings } = useCompanySettings();
    const deleteDeal = useDeleteDeal();
    const updateDeal = useUpdateDeal();

    const { getFilter, setFilter, clearFilters, activeCount } = useFilters();
    const stageFilter = getFilter('stage');
    const searchFilter = getFilter('search');

    const filteredDeals = deals.filter(deal => {
        if (stageFilter && deal.stage !== stageFilter) return false;
        if (searchFilter) {
            const search = searchFilter.toLowerCase();
            return (
                deal.lead?.company_name.toLowerCase().includes(search) ||
                deal.lead?.contact_name.toLowerCase().includes(search)
            );
        }
        return true;
    });

    const {
        selectedIds,
        handleSelectAll,
        handleSelectOne,
        clearSelection,
        isSelected,
        allSelected
    } = useBulkActions(filteredDeals);

    const currency = settings?.currency || '₹';

    const handleBulkExport = (exportFormat: 'csv' | 'excel') => {
        const selectedData = filteredDeals.filter(d => selectedIds.includes(d.id)).map(d => ({
            'Company': d.lead?.company_name,
            'Contact': d.lead?.contact_name,
            'Value': d.deal_value,
            'Stage': d.stage,
            'Probability': d.probability + '%',
            'Expected Close': d.expected_close_date ? format(new Date(d.expected_close_date), 'yyyy-MM-dd') : '-'
        }));

        if (exportFormat === 'csv') {
            exportToCSV(selectedData, 'deals_export');
        } else {
            exportToExcel(selectedData, 'deals_export');
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} deals?`)) return;
        try {
            const { error } = await supabase.from('deals').delete().in('id', selectedIds);
            if (error) throw error;
            toast.success('Deals deleted');
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['deals'] });
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        }
    };

    const handleBulkStatusChange = async (newStage: string) => {
        try {
            const { error } = await supabase.from('deals').update({ stage: newStage }).in('id', selectedIds);
            if (error) throw error;
            toast.success('Stages updated');
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['deals'] });
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'won': return 'bg-success/20 text-success';
            case 'lost': return 'bg-destructive/20 text-destructive';
            case 'negotiation': return 'bg-primary/20 text-primary';
            case 'proposal': return 'bg-warning/20 text-warning-foreground';
            default: return 'bg-info/20 text-info';
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Deals</h1>
                    <Button onClick={() => navigate('/pipeline')}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Pipeline
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-sm">
                        <Input
                            placeholder="Search deals..."
                            value={searchFilter || ''}
                            onChange={(e) => setFilter('search', e.target.value)}
                        />
                    </div>
                    <FilterPanel activeCount={activeCount} onClear={clearFilters}>
                        <FilterSection title="Stage">
                            <Select value={stageFilter || ''} onValueChange={(v) => setFilter('stage', v === 'all' ? null : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    <SelectItem value="qualified">Qualified</SelectItem>
                                    <SelectItem value="proposal">Proposal</SelectItem>
                                    <SelectItem value="negotiation">Negotiation</SelectItem>
                                    <SelectItem value="won">Won</SelectItem>
                                    <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                            </Select>
                        </FilterSection>
                    </FilterPanel>
                </div>

                {isLoading ? (
                    <p className="text-muted-foreground">Loading deals...</p>
                ) : filteredDeals.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-lg border border-border">
                        <p className="text-muted-foreground mb-4">No deals found</p>
                        <Button variant="outline" onClick={() => navigate('/leads')}>
                            Go to Leads to Qualify a Deal
                        </Button>
                    </div>
                ) : (
                    <div className="bg-card rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="crm-table">
                                <thead>
                                    <tr>
                                        <th className="w-8 pl-4">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            />
                                        </th>
                                        <th>Company</th>
                                        <th>Contact</th>
                                        <th>Value</th>
                                        <th>Stage</th>
                                        <th>Probability</th>
                                        <th>Expected Close</th>
                                        <th className="w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDeals.map((deal) => (
                                        <tr key={deal.id} className={isSelected(deal.id) ? "bg-muted/50" : ""}>
                                            <td className="pl-4">
                                                <Checkbox
                                                    checked={isSelected(deal.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(deal.id, !!checked)}
                                                />
                                            </td>
                                            <td className="font-medium">{deal.lead?.company_name}</td>
                                            <td>{deal.lead?.contact_name}</td>
                                            <td className="text-primary font-semibold">
                                                {currency}{deal.deal_value?.toLocaleString('en-IN') || '0'}
                                            </td>
                                            <td>
                                                <Badge className={getStageColor(deal.stage)}>
                                                    {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
                                                </Badge>
                                            </td>
                                            <td>{deal.probability}%</td>
                                            <td className="text-muted-foreground text-sm">
                                                {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'dd MMM yyyy') : '-'}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <Link to={`/deals/${deal.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <BulkActionBar
                    entityName="Deals"
                    selectedCount={selectedIds.length}
                    onClearSelection={clearSelection}
                    onDelete={handleBulkDelete}
                    onExport={handleBulkExport}
                    onStatusChange={handleBulkStatusChange}
                    statusOptions={[
                        { label: 'Qualified', value: 'qualified' },
                        { label: 'Proposal', value: 'proposal' },
                        { label: 'Negotiation', value: 'negotiation' },
                        { label: 'Won', value: 'won' },
                        { label: 'Lost', value: 'lost' },
                    ]}
                />
            </div>
        </AppLayout>
    );
}
