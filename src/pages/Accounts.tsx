import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Eye, Building2, Globe, Phone } from 'lucide-react';
import { AccountForm } from '@/components/accounts/AccountForm';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/components/ui/filter-panel';
import { format } from 'date-fns';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { getFilter, setFilter } = useFilters();
  const searchFilter = getFilter('search');

  const filteredAccounts = accounts.filter(acc => {
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      return (
        acc.name.toLowerCase().includes(search) ||
        (acc.industry && acc.industry.toLowerCase().includes(search)) ||
        (acc.website && acc.website.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const handleCreate = (data: any) => {
    createAccount.mutate(data, {
      onSuccess: () => setIsFormOpen(false)
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAccount.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground text-sm">Manage your customer companies and organizations.</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm" className="h-8 text-xs bg-black text-white hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Account
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search accounts..."
              value={searchFilter || ''}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-dashed">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground mb-4">No accounts found</p>
            <Button onClick={() => setIsFormOpen(true)} variant="outline">
              Create Your First Account
            </Button>
          </div>
        ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="crm-table">
              <thead>
                <tr>
                  <th className="pl-4">Account Name</th>
                  <th>Industry</th>
                  <th>Website</th>
                  <th>Phone</th>
                  <th>Created</th>
                  <th className="w-24 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                    <td className="pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <Link to={`/accounts/${account.id}`} className="font-semibold text-xs hover:text-primary transition-colors truncate max-w-[200px]">
                          {account.name}
                        </Link>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">{account.industry || '—'}</td>
                    <td className="text-xs">
                      {account.website ? (
                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[150px] inline-block">
                          {account.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="text-xs text-muted-foreground">{account.phone || '—'}</td>
                    <td className="text-[10px] text-muted-foreground">
                      {format(new Date(account.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="pr-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Link to={`/accounts/${account.id}`}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </Link>
                        <PermissionGuard requireAdmin>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(account.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Create Account Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
              <DialogTitle>Add New Account</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <AccountForm 
                onSubmit={handleCreate} 
                onCancel={() => setIsFormOpen(false)} 
                isLoading={createAccount.isPending} 
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this account? This will not delete associated contacts but will break the relationship.
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
      </div>
    </AppLayout>
  );
}
