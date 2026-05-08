import React, { useState } from 'react';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLeads, useCreateLead, useDeleteLead } from '@/hooks/useLeads';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { LeadForm } from '@/components/leads/LeadForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Plus, Trash2, Eye, Upload, FileDown } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveCompanyId } from '@/lib/auth-utils';
import { useRef } from 'react';
import { useLeadScores } from '@/hooks/useAIInsights';
function LeadScoreBadge({ leadId, scoreMap }: { leadId: string; scoreMap: Map<string, any> }) {
  const score = scoreMap.get(leadId);
  if (!score) return <span className="text-xs text-muted-foreground">—</span>;
  const color =
    score.label === 'Hot' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
      score.label === 'Warm' ? 'bg-amber-100 text-amber-700 border-amber-200' :
        'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${score.label === 'Hot' ? 'bg-emerald-500' : score.label === 'Warm' ? 'bg-amber-500' : 'bg-slate-400'
        }`} />
      {score.label} {score.score}
    </span>
  );
}

export default function Leads() {
  const { user, companyId } = useAuth();
  const {
    data: leads = [],
    isLoading
  } = useLeads();
  const { scoreMap } = useLeadScores(leads);
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
    console.log('[Import] handleImport fired');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('[Import] No file selected');
      return;
    }
    console.log('[Import] File selected:', file.name, 'size:', file.size, 'type:', file.type);

    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const data = await parseImportFile(file);
      console.log('[Import] Parsed data rows:', data?.length, 'First row keys:', data?.[0] ? Object.keys(data[0]) : 'none');
      console.log('[Import] First row sample:', data?.[0]);

      if (!data || data.length === 0) {
        toast.error('No data found in the file.');
        return;
      }

      if (!user) {
        console.log('[Import] No user found');
        toast.error('You must be logged in to import leads.');
        return;
      }
      console.log('[Import] User ID:', user.id, 'companyId from context:', companyId);

      const effectiveCompanyId = await getEffectiveCompanyId(companyId);
      console.log('[Import] Effective company ID:', effectiveCompanyId);

      // Helper: case-insensitive key lookup
      const getField = (row: any, ...keys: string[]): string => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') return String(row[key]);
        }
        const rowKeys = Object.keys(row);
        for (const key of keys) {
          const found = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
          if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return String(row[found]);
        }
        return '';
      };

      // Valid statuses allowed by DB check constraint
      const VALID_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

      // Map common external status names to valid DB statuses
      const STATUS_MAP: Record<string, string> = {
        'enquiry': 'new',
        'inquiry': 'new',
        'fresh': 'new',
        'open': 'new',
        'active': 'contacted',
        'follow up': 'contacted',
        'followup': 'contacted',
        'follow-up': 'contacted',
        'in progress': 'contacted',
        'responded': 'contacted',
        'interested': 'qualified',
        'hot': 'qualified',
        'warm': 'contacted',
        'cold': 'new',
        'converted': 'won',
        'closed won': 'won',
        'closed lost': 'lost',
        'closed': 'lost',
        'rejected': 'lost',
        'dead': 'lost',
        'junk': 'lost',
        'quote sent': 'proposal',
        'quotation': 'proposal',
        'negotiation': 'proposal',
      };

      const normalizeStatus = (raw: string): string => {
        const lower = raw.toLowerCase().trim();
        if (VALID_STATUSES.includes(lower)) return lower;
        return STATUS_MAP[lower] || 'new';
      };

      const leadsToInsert = data.map(row => ({
        company_name: getField(row, 'company_name', 'Company Name', 'Company', 'company', 'CompanyName', 'Firm', 'firm', 'Organization', 'organization', 'org'),
        contact_name: getField(row, 'contact_name', 'Contact Name', 'Contact', 'contact', 'ContactName', 'Name', 'name', 'Contact Person', 'contact_person', 'Person'),
        email: getField(row, 'email', 'Email', 'EMAIL', 'E-mail', 'e-mail', 'Email Address', 'email_address', 'Mail', 'mail'),
        phone: getField(row, 'phone', 'Phone', 'PHONE', 'Phone Number', 'phone_number', 'Mobile', 'mobile', 'Tel', 'tel', 'Telephone', 'Contact Number'),
        website: getField(row, 'website', 'Website', 'URL', 'Web', 'Site', 'domain'),
        lead_source: getField(row, 'lead_source', 'Lead Source', 'Source', 'Origin', 'lead-source') || 'Website',
        customer_requirement: getField(row, 'customer_requirement', 'Customer Requirement', 'Requirements', 'Needs', 'Requirement'),
        status: normalizeStatus(getField(row, 'status', 'Status', 'STATUS', 'Lead Status') || 'new'),
        is_qualified: (['yes', 'true', '1'].includes(
          getField(row, 'is_qualified', 'Is Qualified', 'Qualified', 'qualified', 'IsQualified').toLowerCase()
        )),
        created_by: user.id,
        company_id: effectiveCompanyId
      })).filter(l => l.company_name);

      console.log('[Import] Leads to insert:', leadsToInsert.length, 'Sample:', leadsToInsert[0]);

      if (leadsToInsert.length === 0) {
        console.log('[Import] All rows filtered out - no company_name found');
        toast.error('No valid leads found (Company Name is required).');
        return;
      }

      console.log('[Import] Inserting into Supabase...');
      const { data: insertedData, error } = await supabase.from('leads').insert(leadsToInsert).select();
      console.log('[Import] Supabase response - data:', insertedData, 'error:', error);

      if (error) throw error;

      toast.success(`${leadsToInsert.length} leads imported successfully`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err: any) {
      console.error('[Import] ERROR:', err);
      toast.error('Error importing file: ' + err.message);
    }
  };
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true);
      setSearchParams({}); // Clear the parameter after opening
    }
  }, [searchParams, setSearchParams]);

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
                <th className="">Company</th>
                <th>Contact name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Status</th>
                <th>AI Score</th>
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
                <td className="text-xs text-muted-foreground">{lead.lead_source || 'Website'}</td>
                <td>
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td>
                  <LeadScoreBadge leadId={lead.id} scoreMap={scoreMap} />
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
        </div>
      </div>}

      {/* Create Lead Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl h-[90vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 bg-muted/20 border-b shrink-0">
            <DialogTitle className="text-xl font-bold tracking-tight">Create New Lead</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 flex flex-col min-h-0">
            <LeadForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} isLoading={createLead.isPending} />
          </div>
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