import React, { useState } from 'react';
import { useInteractionLogs, useCreateInteractionLog, useDeleteInteractionLog } from '@/hooks/useInteractionLogs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { Phone, MessageSquare, Mail, Calendar, MoreVertical, Trash2, Plus, Clock, User, FileText } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface InteractionLogSectionProps {
  entityType: 'lead' | 'deal';
  entityId: string;
}

const INTERACTION_ICONS = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
  note: FileText,
  other: MessageSquare,
};

const INTERACTION_COLORS = {
  call: 'bg-blue-50 text-blue-600 border-blue-100',
  meeting: 'bg-purple-50 text-purple-600 border-purple-100',
  email: 'bg-sky-50 text-sky-600 border-sky-100',
  note: 'bg-amber-50 text-amber-600 border-amber-100',
  other: 'bg-slate-50 text-slate-600 border-slate-100',
};

export function InteractionLogSection({ entityType, entityId }: InteractionLogSectionProps) {
  const { data: logs = [], isLoading } = useInteractionLogs(entityType, entityId);
  const createLog = useCreateInteractionLog();
  const deleteLog = useDeleteInteractionLog();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'call' | 'meeting' | 'email' | 'note' | 'other'>('call');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    const interactionDate = new Date(`${date}T${time}:00`).toISOString();

    await createLog.mutateAsync({
      [entityType === 'lead' ? 'lead_id' : 'deal_id']: entityId,
      interaction_type: type,
      notes,
      interaction_date: interactionDate,
    });

    setIsAddDialogOpen(false);
    setNotes('');
    setType('call');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteLog.mutate({ id, entityType, entityId });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          Follow-up Notes
        </h3>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-slate-400 py-4">Loading notes...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No follow-up notes yet</p>
            <Button variant="link" size="sm" onClick={() => setIsAddDialogOpen(true)} className="text-xs text-blue-500">
              Log your first interaction
            </Button>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {logs.map((log) => {
              const Icon = INTERACTION_ICONS[log.interaction_type] || MessageSquare;
              return (
                <div key={log.id} className="relative pl-12 pb-6 group">
                  {/* Timeline Dot */}
                  <div className={cn(
                    "absolute left-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm",
                    INTERACTION_COLORS[log.interaction_type]
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Card */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm group-hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                            {log.interaction_type === 'call' ? 'Phone Call' : 
                             log.interaction_type === 'meeting' ? 'Meeting' : 
                             log.interaction_type === 'email' ? 'Email Sent' : 
                             log.interaction_type === 'note' ? 'Internal Note' : 'Interaction'}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.interaction_date), 'dd MMM yyyy, h:mm a')}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDelete(log.id)} className="text-red-600">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{log.notes}</p>
                    
                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span>{log.performed_by_name}</span>
                      </div>
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Follow-up Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNote} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Interaction Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="note">Internal Note</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interaction Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Time</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-9" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">What was discussed?</Label>
              <Textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Enter details of the conversation..."
                className="min-h-[120px] resize-none"
                required
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLog.isPending} className="bg-blue-600 hover:bg-blue-700">
                {createLog.isPending ? 'Saving...' : 'Save Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
