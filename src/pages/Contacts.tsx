import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContacts, useCreateContact, useDeleteContact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Eye, User, Mail, Phone, Building } from 'lucide-react';
import { ContactForm } from '@/components/contacts/ContactForm';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/components/ui/filter-panel';
import { format } from 'date-fns';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Contacts() {
  const { data: contacts = [], isLoading } = useContacts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { getFilter, setFilter } = useFilters();
  const searchFilter = getFilter('search');

  const filteredContacts = contacts.filter(contact => {
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      return (
        contact.first_name.toLowerCase().includes(search) ||
        contact.last_name.toLowerCase().includes(search) ||
        (contact.email && contact.email.toLowerCase().includes(search)) ||
        (contact.account?.name && contact.account.name.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const handleCreate = (data: any) => {
    createContact.mutate(data, {
      onSuccess: () => setIsFormOpen(false)
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteContact.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground text-sm">Manage the people at your customer companies.</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="sm" className="h-8 text-xs bg-black text-white hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Contact
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search contacts..."
              value={searchFilter || ''}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-card rounded-lg border border-border h-64 animate-pulse" />
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-dashed">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground mb-4">No contacts found</p>
            <Button onClick={() => setIsFormOpen(true)} variant="outline">
              Create Your First Contact
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th className="pl-6">Contact Name</th>
                    <th>Account</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Job Title</th>
                    <th className="w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => (
                    <tr key={contact.id}>
                      <td className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {contact.first_name[0]}{contact.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold">{contact.first_name} {contact.last_name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">
                              {contact.department || 'No Department'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {contact.account ? (
                          <Link 
                            to={`/accounts/${contact.account_id}`}
                            className="flex items-center gap-2 text-primary hover:underline font-medium"
                          >
                            <Building className="h-3 w-3" />
                            {contact.account.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td>
                        {contact.email ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {contact.phone ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="text-muted-foreground text-sm">
                        {contact.job_title || '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link to={`/contacts/${contact.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          <PermissionGuard requireAdmin>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDeleteId(contact.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
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

        {/* Create Contact Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <ContactForm 
                onSubmit={handleCreate} 
                onCancel={() => setIsFormOpen(false)} 
                isLoading={createContact.isPending} 
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this contact?
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
