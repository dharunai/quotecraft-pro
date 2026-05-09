import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContact, useUpdateContact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building, Mail, Phone, MapPin, ArrowLeft, Calendar, FileText, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContactForm } from '@/components/contacts/ContactForm';
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

export default function ContactDetail() {
  const { id } = useParams();
  const { data: contact, isLoading } = useContact(id);
  const updateContact = useUpdateContact();
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  if (isLoading) return <AppLayout><div className="animate-pulse h-64 bg-muted rounded-lg" /></AppLayout>;
  if (!contact) return <AppLayout><div className="text-center py-20">Contact not found</div></AppLayout>;

  const handleUpdate = (data: any) => {
    updateContact.mutate({ id, ...data }, { onSuccess: () => setIsEditOpen(false) });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 py-1.5 border-b border-slate-100 bg-white/50 sticky top-0 z-10 backdrop-blur-sm">
          <Link to="/contacts">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">{contact.first_name} {contact.last_name}</h1>
              <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest px-1 py-0 border-blue-200 text-blue-600 bg-blue-50/50 h-3.5">
                Contact
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{contact.job_title || 'Individual Contact'}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditOpen(true)} 
            className="h-6 text-[9px] font-bold px-2 border-slate-200"
          >
            <Edit2 className="h-2.5 w-2.5 mr-1 text-slate-400" />
            Edit Contact
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Bio & Details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm text-center">
               <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-background shadow-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {contact.first_name[0]}{contact.last_name[0]}
                  </AvatarFallback>
               </Avatar>
               <h2 className="font-bold text-xl">{contact.first_name} {contact.last_name}</h2>
               <p className="text-sm text-muted-foreground mb-4">{contact.department || 'Business Professional'}</p>
               
               <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {contact.email && <Badge variant="outline" className="text-[10px]">{contact.email}</Badge>}
                  {contact.phone && <Badge variant="outline" className="text-[10px]">{contact.phone}</Badge>}
               </div>

               <div className="text-left pt-6 border-t space-y-4">
                  <div className="flex items-start gap-3">
                    <Building className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <div className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Associated Account</div>
                      {contact.account ? (
                        <Link to={`/accounts/${contact.account_id}`} className="text-sm font-bold text-primary hover:underline">
                          {contact.account.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">Independent</span>
                      )}
                    </div>
                  </div>
                   <InlineField label="Email" value={contact.email} onSave={(v: string) => handleUpdate({ email: v })} icon={Mail} placeholder="email@example.com" />
                   <InlineField label="Phone" value={contact.phone} onSave={(v: string) => handleUpdate({ phone: v })} icon={Phone} placeholder="+1..." />
                   <InlineField label="Job Title" value={contact.job_title} onSave={(v: string) => handleUpdate({ job_title: v })} icon={User} placeholder="Title..." />
                   <InlineField label="Department" value={contact.department} onSave={(v: string) => handleUpdate({ department: v })} icon={Building} placeholder="Dept..." />
               </div>
            </div>
          </div>

          {/* Right: Activity & Notes */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/5 font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Notes & Profile Description
                </div>
                <div className="p-6">
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     {contact.description || 'No detailed description available for this contact.'}
                   </p>
                </div>
             </div>

             <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/5 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Recent Activity
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Last 30 Days</span>
                </div>
                <div className="p-12 text-center text-muted-foreground text-sm italic">
                  No recent activities or interaction logs found for {contact.first_name}.
                </div>
             </div>
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactForm 
            initialData={contact}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditOpen(false)}
            isLoading={updateContact.isPending}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
