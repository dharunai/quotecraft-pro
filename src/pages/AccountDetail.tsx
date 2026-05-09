import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAccount, useUpdateAccount } from '@/hooks/useAccounts';
import { useContacts, useCreateContact } from '@/hooks/useContacts';
import { useCreateDeal } from '@/hooks/useDeals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, Phone, MapPin, Users, Briefcase, Plus, ArrowLeft, Mail, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccountForm } from '@/components/accounts/AccountForm';
import { ContactForm } from '@/components/contacts/ContactForm';
import { DealForm } from '@/components/pipeline/DealForm';
import { cn } from '@/lib/utils';

// Inline Field Component
function InlineField({ label, value, onSave, icon: Icon, placeholder = '—' }: any) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setDraft(value || ''); }, [value]);
  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => { setEditing(false); onSave(draft); };
  
  return (
    <div className="group py-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 opacity-70" />}{label}
      </p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input 
            ref={inputRef}
            value={draft} 
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-full text-xs border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none bg-white"
          />
        </div>
      ) : (
        <div onClick={() => setEditing(true)} className="cursor-pointer group/f flex items-center gap-2 min-h-[24px] rounded px-1 -mx-1 hover:bg-slate-100 transition-all">
          <span className={cn('text-xs flex-1', value ? 'text-slate-800' : 'text-slate-400 italic')}>{value || placeholder}</span>
          <Edit2 className="h-2.5 w-2.5 text-slate-300 opacity-0 group-hover/f:opacity-100" />
        </div>
      )}
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: account, isLoading: accountLoading } = useAccount(id);
  const { data: contacts = [] } = useContacts(id);
  const updateAccount = useUpdateAccount();
  const createContact = useCreateContact();
  const createDeal = useCreateDeal();
  
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isNewContactOpen, setIsNewContactOpen] = React.useState(false);
  const [isNewDealOpen, setIsNewDealOpen] = React.useState(false);

  if (accountLoading) return <AppLayout><div className="animate-pulse h-64 bg-muted rounded-lg" /></AppLayout>;
  if (!account) return <AppLayout><div className="text-center py-20">Account not found</div></AppLayout>;

  const handleUpdate = (data: any) => {
    updateAccount.mutate({ id, ...data }, { onSuccess: () => setIsEditOpen(false) });
  };

  const handleCreateContact = (data: any) => {
    createContact.mutate({ ...data, account_id: id }, { onSuccess: () => setIsNewContactOpen(false) });
  };

  const handleCreateDeal = (data: any) => {
    // Note: deal table uses lead_id as primary link currently, 
    // but we can pass account_id if the backend supports it.
    // Based on useConvertLead, it supports account_id.
    createDeal.mutate({ ...data, account_id: id }, { onSuccess: () => setIsNewDealOpen(false) });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 py-1.5 border-b border-slate-100 bg-white/50 sticky top-0 z-10 backdrop-blur-sm">
          <Link to="/accounts">
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100">
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">{account.name}</h1>
              <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest px-1 py-0 border-blue-200 text-blue-600 bg-blue-50/50 h-3.5">
                Account
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{account.industry || 'No Industry Specified'}</p>
          </div>
          <div className="flex gap-1.5">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setIsEditOpen(true)} 
               className="h-6 text-[9px] font-bold px-2 border-slate-200 hover:bg-slate-50"
             >
               <Edit2 className="h-2.5 w-2.5 mr-1 text-slate-400" />
               Edit Account
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Company Details
              </h2>
              <div className="space-y-4">
                <InlineField label="Website" value={account.website} onSave={(v: string) => handleUpdate({ website: v })} icon={Globe} placeholder="www.example.com" />
                <InlineField label="Phone" value={account.phone} onSave={(v: string) => handleUpdate({ phone: v })} icon={Phone} placeholder="+1..." />
                <InlineField label="Billing Address" value={account.billing_address} onSave={(v: string) => handleUpdate({ billing_address: v })} icon={MapPin} placeholder="Address..." />
                <div className="pt-4 mt-4 border-t grid grid-cols-2 gap-4">
                   <div>
                     <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Revenue</div>
                     <div className="text-sm font-bold text-primary">
                       {account.annual_revenue ? `₹${account.annual_revenue.toLocaleString()}` : '—'}
                     </div>
                   </div>
                   <div>
                     <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Employees</div>
                     <div className="text-sm font-bold text-primary">
                       {account.employees_count || '—'}
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl border border-border p-6">
               <h3 className="text-sm font-bold mb-2 uppercase tracking-widest opacity-50">Description</h3>
               <p className="text-sm text-muted-foreground leading-relaxed italic">
                 {account.description || 'No description provided for this account.'}
               </p>
            </div>
          </div>

          {/* Right Column: Related Contacts and Deals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/5">
                <h2 className="font-bold text-[10px] flex items-center gap-2 uppercase tracking-widest text-slate-400">
                  <Users className="h-3 w-3 text-primary/50" />
                  Contacts ({contacts.length})
                </h2>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 text-[9px] font-bold px-2 border-slate-200"
                  onClick={() => setIsNewContactOpen(true)}
                >
                  <Plus className="h-2.5 w-2.5 mr-1 text-slate-400" />
                  New Contact
                </Button>
              </div>
              <div className="divide-y divide-border">
                {contacts.length === 0 ? (
                  <div className="px-6 py-10 text-center text-muted-foreground italic text-sm">
                    No contacts associated with this account.
                  </div>
                ) : (
                  contacts.map(contact => (
                    <div key={contact.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold border border-primary/10">
                            {contact.first_name[0]}{contact.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm">{contact.first_name} {contact.last_name}</div>
                          <div className="text-xs text-muted-foreground">{contact.job_title || 'No Title'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {contact.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                        <Link to={`/contacts/${contact.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold px-2 text-primary hover:bg-primary/5">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-[10px] flex items-center gap-2 uppercase tracking-widest text-slate-400">
                    <Briefcase className="h-3 w-3 text-primary/50" />
                    Deals & Business
                  </h2>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-[9px] font-bold px-2 border-slate-200"
                    onClick={() => setIsNewDealOpen(true)}
                  >
                    <Plus className="h-2.5 w-2.5 mr-1 text-slate-400" />
                    Create Deal
                  </Button>
                </div>
               <div className="text-center py-8 border rounded-lg border-dashed text-sm text-muted-foreground">
                 No active deals found for this account.
               </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Edit Account</DialogTitle>
          </DialogHeader>
          <AccountForm 
            initialData={account}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditOpen(false)}
            isLoading={updateAccount.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm 
            initialData={{ account_id: id }}
            onSubmit={handleCreateContact}
            onCancel={() => setIsNewContactOpen(false)}
            isLoading={createContact.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Create New Deal</DialogTitle>
          </DialogHeader>
          <DealForm 
            onSubmit={handleCreateDeal}
            onCancel={() => setIsNewDealOpen(false)}
            isLoading={createDeal.isPending}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
