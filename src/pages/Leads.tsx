import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads, useCreateLead, useDeleteLead } from '@/hooks/useLeads';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { LeadForm } from '@/components/leads/LeadForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Plus, Trash2, Eye, Upload, FileDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/database';
import { PermissionGuard } from '@/components/PermissionGuard';
import { FilterPanel, FilterSection, useFilters } from '@/components/ui/filter-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useBulkActions } from '@/hooks/useBulkActions';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { exportToCSV, exportToExcel, flattenData, parseImportFile, downloadLeadTemplate } from '@/lib/exportUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRef } from 'react';
export default function Leads() {
  const {
    data: leads = [],
    isLoading
  } = useLeads();
  const queryClient = useQueryClient();

  const { getFilter, setFilter, clearFilters, activeCount } = useFilters();
  const statusFilter = getFilter('status');
  const searchFilter = getFilter('search');

  // Filter logic
  const filteredLeads = leads.filter(lead => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      return (
        lead.company_name.toLowerCase().includes(search) ||
        lead.contact_name.toLowerCase().includes(search) ||
        (lead.email && lead.email.toLowerCase().includes(search))
      );
    }
    return true;
  });
  // Bulk Selection State
  const {
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    clearSelection,
    isSelected,
    allSelected,
    someSelected
  } = useBulkActions(filteredLeads);

  const handleBulkExport = (format: 'csv' | 'excel') => {
    const selectedData = filteredLeads.filter(l => selectedIds.includes(l.id));
    const flatData = flattenData(selectedData, 'leads');

    if (format === 'csv') {
      exportToCSV(flatData, 'leads_export');
    } else {
      exportToExcel(flatData, 'leads_export');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) return;

    // In a real app, use a proper backend function or Promise.all.
    // For now, looping to simulate.
    try {
      const { error } = await supabase.from('leads').delete().in('id', selectedIds);
      if (error) throw error;

      toast.success(`${selectedIds.length} leads deleted successfully`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      toast.error('Failed to delete leads: ' + e.message);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseImportFile(file);
      if (!data || data.length === 0) {
        toast.error('No data found in the file.');
        return;
      }

      // Map imported data to leads table structure
      // We'll try to find common column names
      const leadsToInsert = data.map(row => ({
        company_name: row.company_name || row['Company Name'] || row.Company || '',
        contact_name: row.contact_name || row['Contact Name'] || row.Contact || '',
        email: row.email || row.Email || '',
        phone: row.phone || row.Phone || '',
        status: row.status || row.Status || 'new',
        is_qualified: row.is_qualified === 'Yes' || row.is_qualified === true || false
      })).filter(l => l.company_name); // Only import if company name exists

      if (leadsToInsert.length === 0) {
        toast.error('No valid leads found (Company Name is required).');
        return;
      }

      const { error } = await supabase.from('leads').insert(leadsToInsert);
      if (error) throw error;

      toast.success(`${leadsToInsert.length} leads imported successfully`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error('Error importing file: ' + err.message);
    }
  };
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleCreate = (data: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    createLead.mutate(data, {
      onSuccess: () => setIsFormOpen(false)
    });
  };
  const handleDelete = () => {
    if (deleteId) {
      deleteLead.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };
  return <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex items-center gap-2">
          <Link to="/business-card-scanner">
            <Button variant="outline">
              <Upload className="mr-2 w-4 h-4" />
              Scan Business Card
            </Button>
          </Link>
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => downloadLeadTemplate()}>
            <FileDown className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search leads..."
            value={searchFilter || ''}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <FilterPanel activeCount={activeCount} onClear={clearFilters}>
          <FilterSection title="Status">
            <Select value={statusFilter || ''} onValueChange={(v) => setFilter('status', v === 'all' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </FilterSection>
        </FilterPanel>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading leads...</p> : filteredLeads.length === 0 ? <div className="text-center py-12 bg-card rounded-lg border border-border">
        <p className="text-muted-foreground mb-4">No leads found</p>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Lead
        </Button>
      </div> : <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="crm-table">
          <thead>
            <tr>
              <th className="w-8 pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </th>
              <th className="">Company</th>
              <th>Contact name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
              <th className="w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => <tr key={lead.id} className={isSelected(lead.id) ? "bg-muted/50" : ""}>
              <td className="pl-4">
                <Checkbox
                  checked={isSelected(lead.id)}
                  onCheckedChange={(checked) => handleSelectOne(lead.id, !!checked)}
                />
              </td>
              <td className="font-medium">{lead.company_name}</td>
              <td>{lead.contact_name}</td>
              <td className="text-muted-foreground">{lead.email || '-'}</td>
              <td className="text-muted-foreground">{lead.phone || '-'}</td>
              <td>
                <LeadStatusBadge status={lead.status} />
              </td>
              <td className="text-muted-foreground">
                {format(new Date(lead.created_at), 'dd MMM yyyy')}
              </td>
              <td>
                <div className="flex items-center gap-1">
                  <Link to={`/leads/${lead.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <PermissionGuard requireAdmin>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(lead.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}

      {/* Create Lead Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} isLoading={createLead.isPending} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BulkActionBar
        entityName="Leads"
        selectedCount={selectedIds.length}
        onClearSelection={clearSelection}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
      />
    </div>
  </AppLayout>;
}