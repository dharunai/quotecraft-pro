import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSentEmails, SentEmail } from '@/hooks/useSentEmails';
import { useLeads, useCreateLead } from '@/hooks/useLeads';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import { useMeetings } from '@/hooks/useMeetings';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';
import { LeadForm } from '@/components/leads/LeadForm';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Mail, 
  User, 
  Calendar, 
  Paperclip, 
  ChevronRight, 
  ArrowLeft,
  Clock,
  Send,
  MoreVertical,
  Inbox,
  Star,
  RefreshCcw,
  Archive,
  Trash2,
  MailOpen,
  ChevronLeft,
  Settings,
  Plus,
  FileText,
  AlertCircle,
  Clock3,
  Trash,
  Phone,
  CheckCircle,
  Building2,
  UserCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useEmailActions } from '@/hooks/useEmailActions';
import { ComposeEmailModal } from '@/components/emails/ComposeEmailModal';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SentEmails() {
  const { data: emails = [], isLoading, refetch } = useSentEmails();
  const { data: leads = [], refetch: refetchLeads } = useLeads();
  const { data: tasks = [], refetch: refetchTasks } = useTasks();
  const { updateEmailStatus, snoozeEmail } = useEmailActions();
  
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState('sent');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<{ id?: string, to?: string, subject?: string, body?: string } | null>(null);

  // CRM context details and integrations
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const { getMeetings } = useMeetings();

  // Modals / Dialog states
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // Quick Task Form State
  const [taskTitle, setTaskTitle] = useState('Email Follow-up');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [profiles, setProfiles] = useState<any[]>([]);

  // Mutations
  const createLead = useCreateLead();
  const createTask = useCreateTask();

  const handleEmailClick = (email: SentEmail) => {
    if (email.folder === 'drafts') {
      setComposeData({
        id: email.id,
        to: email.recipient_email,
        subject: email.subject,
        body: email.body_html.replace(/<[^>]*>/g, '') // Simple text conversion
      });
      setIsComposeOpen(true);
    } else {
      setSelectedEmail(email);
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          email.recipient_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFolder === 'starred') return matchesSearch && email.is_starred;
    if (activeFolder === 'snoozed') return matchesSearch && email.is_snoozed;
    return matchesSearch && email.folder === activeFolder;
  });

  const toggleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length && filteredEmails.length > 0) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map(e => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedEmails.includes(id)) {
      setSelectedEmails(selectedEmails.filter(i => i !== id));
    } else {
      setSelectedEmails([...selectedEmails, id]);
    }
  };

  const handleStar = (email: SentEmail, e: React.MouseEvent) => {
    e.stopPropagation();
    updateEmailStatus.mutate({ id: email.id, updates: { is_starred: !email.is_starred } });
  };

  const handleMoveToTrash = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateEmailStatus.mutate({ id, updates: { folder: 'trash' } }, {
      onSuccess: () => {
        if (selectedEmail?.id === id) setSelectedEmail(null);
        toast.success('Moved to trash');
      }
    });
  };

  const handleArchive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateEmailStatus.mutate({ id, updates: { folder: 'archive' } }, {
      onSuccess: () => {
        if (selectedEmail?.id === id) setSelectedEmail(null);
        toast.success('Email archived');
      }
    });
  };

  const handleSnooze = (id: string, days: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const until = new Date();
    until.setDate(until.getDate() + days);
    snoozeEmail.mutate({ id, until: until.toISOString() }, {
      onSuccess: () => {
        if (selectedEmail?.id === id) setSelectedEmail(null);
      }
    });
  };

  // Find matching lead for current selected email recipient
  const matchingLead = selectedEmail
    ? leads.find(lead => lead.email?.toLowerCase() === selectedEmail.recipient_email?.toLowerCase())
    : null;

  // Fetch profiles for task assignee selection
  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setProfiles(data);
    });
  }, []);

  // Fetch meetings function
  const fetchMeetingsList = async () => {
    setLoadingMeetings(true);
    try {
      const data = await getMeetings();
      setMeetings(data || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  // Fetch meetings when a lead context is established
  useEffect(() => {
    if (matchingLead) {
      fetchMeetingsList();
    }
  }, [matchingLead]);

  // Lead Submission
  const handleLeadSubmit = async (data: any) => {
    try {
      await createLead.mutateAsync(data);
      setIsLeadDialogOpen(false);
      refetchLeads();
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  // Task Submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchingLead) return;
    try {
      await createTask.mutateAsync({
        title: taskTitle,
        description: taskDesc || null,
        due_date: taskDueDate || null,
        priority: taskPriority,
        status: 'pending',
        entity_type: 'lead',
        entity_id: matchingLead.id,
        assigned_to: taskAssignee || null,
      });
      setIsTaskDialogOpen(false);
      setTaskTitle('Email Follow-up');
      setTaskDesc('');
      setTaskDueDate('');
      setTaskPriority('medium');
      setTaskAssignee('');
      refetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Prefilled contact details for new Lead creation
  const prefilledLead = selectedEmail ? (() => {
    const emailLocalPart = selectedEmail.recipient_email.split('@')[0];
    const parsedName = emailLocalPart
      .split(/[._+-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
    const emailDomain = selectedEmail.recipient_email.split('@')[1]?.split('.')[0] || '';
    const parsedCompany = emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1);

    return {
      contact_name: parsedName,
      email: selectedEmail.recipient_email,
      company_name: parsedCompany,
      status: 'new' as const,
      lead_source: 'Email',
    };
  })() : null;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Zoho / Gmail Sidebar */}
          <aside className="w-64 border-r border-slate-100 flex flex-col bg-slate-50/30">
            <div className="p-4">
              <Button 
                onClick={() => setIsComposeOpen(true)}
                className="w-full justify-start gap-3 h-12 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 border-none shadow-none font-bold text-sm"
              >
                <Plus className="h-5 w-5" />
                Compose
              </Button>
            </div>

            <nav className="flex-1 px-2 space-y-0.5">
              {[
                { id: 'inbox', name: 'Inbox', icon: Inbox, count: emails?.filter(e => e?.folder === 'inbox')?.length || 0 },
                { id: 'starred', name: 'Starred', icon: Star, count: emails?.filter(e => e?.is_starred)?.length || 0 },
                { id: 'snoozed', name: 'Snoozed', icon: Clock3, count: emails?.filter(e => e?.is_snoozed)?.length || 0 },
                { id: 'sent', name: 'Sent', icon: Send, count: emails?.filter(e => e?.folder === 'sent')?.length || 0 },
                { id: 'drafts', name: 'Drafts', icon: FileText, count: emails?.filter(e => e?.folder === 'drafts')?.length || 0 },
                { id: 'trash', name: 'Trash', icon: Trash, count: emails?.filter(e => e?.folder === 'trash')?.length || 0 },
              ].map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => { setActiveFolder(folder.id); setSelectedEmail(null); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-r-full text-sm font-medium transition-colors",
                    activeFolder === folder.id 
                      ? "bg-blue-100 text-blue-700 font-bold" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <folder.icon className={cn("h-4 w-4", activeFolder === folder.id ? "text-blue-600" : "text-slate-400")} />
                    {folder.name}
                  </div>
                  {folder.count > 0 && (
                    <span className={cn("text-[10px]", activeFolder === folder.id ? "text-blue-600" : "text-slate-400")}>
                      {folder.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0">
            {selectedEmail ? (
              /* Zoho CRM Message View with CRM Sidebar context split screen */
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Toolbar */}
                <div className="h-14 border-b border-slate-100 flex items-center px-4 justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedEmail(null)} className="h-9 w-9 rounded-full">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => handleArchive(selectedEmail.id)} variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><Archive className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><AlertCircle className="h-4 w-4" /></Button>
                      <Button onClick={() => handleMoveToTrash(selectedEmail.id)} variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><Trash2 className="h-4 w-4" /></Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><MailOpen className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><Clock3 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Email Detail Pane */}
                  <ScrollArea className="flex-1 bg-white border-r border-slate-100">
                    <div className="px-8 py-6 max-w-3xl mx-auto">
                      <div className="flex items-center justify-between mb-6">
                        <h1 className="text-xl font-bold text-slate-900">{selectedEmail.subject}</h1>
                        <Button onClick={(e) => handleStar(selectedEmail, e)} variant="ghost" size="icon" className="rounded-full">
                          <Star className={cn("h-5 w-5", selectedEmail.is_starred ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} />
                        </Button>
                      </div>
                      
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                            {selectedEmail.recipient_email?.[0] || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{selectedEmail.recipient_email}</span>
                              <span className="text-xs text-slate-500">{'<'}{selectedEmail.recipient_email}{'>'}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">to me</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-500">{format(new Date(selectedEmail.created_at), 'MMM d, yyyy, p')}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-3.5 w-3.5 text-slate-300" /></Button>
                          </div>
                        </div>
                      </div>

                      <div 
                        className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans min-h-[300px]"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} 
                      />

                      {selectedEmail.attachments?.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-slate-100">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Paperclip className="h-3 w-3" />
                            {selectedEmail.attachments.length} Attachments
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedEmail.attachments.map((file: any, idx: number) => (
                              <div key={idx} className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 hover:border-blue-200 transition-all">
                                 <div className="h-20 bg-white border-b border-slate-100 flex items-center justify-center overflow-hidden">
                                    <FileText className="h-8 w-8 text-blue-100" />
                                 </div>
                                 <div className="p-3">
                                   <p className="text-xs font-bold text-slate-700 truncate">{file.filename}</p>
                                   <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-tighter font-bold">Attached File</p>
                                 </div>
                                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100">
                                   <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold shadow-sm">Download</Button>
                                 </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* CRM Context Sidebar */}
                  <aside className="w-80 border-l border-slate-200 bg-slate-50/50 flex flex-col h-full overflow-y-auto">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                      <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">CRM Context</h2>
                      {matchingLead ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-none uppercase text-[9px] font-bold">
                          Lead
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100 shadow-none uppercase text-[9px] font-bold">
                          Not in CRM
                        </Badge>
                      )}
                    </div>

                    {matchingLead ? (
                      <div className="flex-1 flex flex-col divide-y divide-slate-100 bg-white">
                        {/* Profile header */}
                        <div className="p-5 flex flex-col items-center text-center bg-white">
                          <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg uppercase mb-2.5 shadow-sm">
                            {matchingLead.contact_name?.[0] || matchingLead.company_name?.[0] || '?'}
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">{matchingLead.contact_name}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{matchingLead.company_name}</p>
                          
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-2 border",
                            matchingLead.status === 'new' && "bg-blue-50 text-blue-700 border-blue-200",
                            matchingLead.status === 'contacted' && "bg-amber-50 text-amber-700 border-amber-200",
                            matchingLead.status === 'qualified' && "bg-violet-50 text-violet-700 border-violet-200",
                            matchingLead.status === 'proposal' && "bg-indigo-50 text-indigo-700 border-indigo-200",
                            matchingLead.status === 'won' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            matchingLead.status === 'lost' && "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {matchingLead.status}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="p-4 space-y-3 bg-white">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</h4>
                          <div className="space-y-2 text-xs text-slate-700">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{matchingLead.email}</span>
                            </div>
                            {matchingLead.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{matchingLead.phone}</span>
                              </div>
                            )}
                            {matchingLead.address && (
                              <div className="flex items-start gap-2">
                                <Trash2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{matchingLead.address}</span>
                              </div>
                            )}
                            {matchingLead.lead_source && (
                              <div className="flex items-center gap-2">
                                <RefreshCcw className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>Source: {matchingLead.lead_source}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CRM Actions */}
                        <div className="p-4 space-y-2 bg-white">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CRM Actions</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              onClick={() => setIsMeetingDialogOpen(true)}
                              variant="outline" 
                              className="text-[11px] font-bold border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 h-8 p-0"
                            >
                              <Calendar className="h-3 w-3" />
                              Schedule Meeting
                            </Button>
                            <Button 
                              onClick={() => setIsTaskDialogOpen(true)}
                              variant="outline" 
                              className="text-[11px] font-bold border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 h-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                              Create Task
                            </Button>
                          </div>
                        </div>

                        {/* Associated Activities */}
                        <div className="p-4 space-y-4 bg-white flex-1 overflow-y-auto">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Activities</h4>
                          
                          {/* Meetings Timeline */}
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meetings</h5>
                            {meetings.filter(m => m.lead_id === matchingLead.id).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No scheduled meetings</p>
                            ) : (
                              <div className="space-y-2">
                                {meetings
                                  .filter(m => m.lead_id === matchingLead.id)
                                  .slice(0, 3)
                                  .map((m: any) => (
                                    <div key={m.id} className="p-2 border border-slate-100 rounded-lg bg-slate-50/50 text-[11px]">
                                      <p className="font-bold text-slate-800 truncate">{m.title}</p>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        {format(new Date(m.start_time), 'MMM d, h:mm a')}
                                      </p>
                                      <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0 h-4 bg-slate-200/50 text-slate-700 capitalize">
                                        {m.status}
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Tasks Timeline */}
                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasks</h5>
                            {tasks.filter(t => t.entity_type === 'lead' && t.entity_id === matchingLead.id).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No associated tasks</p>
                            ) : (
                              <div className="space-y-2">
                                {tasks
                                  .filter(t => t.entity_type === 'lead' && t.entity_id === matchingLead.id)
                                  .slice(0, 3)
                                  .map((t: any) => (
                                    <div key={t.id} className="p-2 border border-slate-100 rounded-lg bg-slate-50/50 text-[11px]">
                                      <p className="font-bold text-slate-800 truncate">{t.title}</p>
                                      {t.due_date && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                          Due: {format(new Date(t.due_date), 'MMM d')}
                                        </p>
                                      )}
                                      <div className="flex gap-1.5 mt-1">
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-slate-200/50 text-slate-700 capitalize">
                                          {t.status}
                                        </Badge>
                                        <Badge variant="secondary" className={cn(
                                          "text-[9px] px-1.5 py-0 h-4 capitalize",
                                          t.priority === 'urgent' && "bg-red-50 text-red-700 border border-red-200",
                                          t.priority === 'high' && "bg-amber-50 text-amber-700 border border-amber-200",
                                          t.priority === 'medium' && "bg-blue-50 text-blue-700 border border-blue-200",
                                          t.priority === 'low' && "bg-slate-100 text-slate-600"
                                        )}>
                                          {t.priority}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 bg-white flex-1">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-full">
                          <Inbox className="h-8 w-8 text-slate-400 opacity-60" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-slate-900">Not Associated</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            This email recipient <strong className="text-slate-700">{selectedEmail.recipient_email}</strong> is not registered as a lead in your CRM database.
                          </p>
                        </div>
                        <Button 
                          onClick={() => setIsLeadDialogOpen(true)}
                          className="w-full font-bold bg-slate-900 text-white hover:bg-slate-800 text-xs h-9 flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                          Add as Lead
                        </Button>
                      </div>
                    )}
                  </aside>
                </div>
              </div>
            ) : (
              /* Zoho CRM Inbox Grid View */
              <>
                {/* Toolbar */}
                <div className="h-14 border-b border-slate-100 flex items-center px-4 justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center p-2 rounded hover:bg-slate-100 transition-colors cursor-pointer group">
                      <Checkbox 
                        checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0} 
                        onCheckedChange={toggleSelectAll} 
                        className="h-4 w-4 border-slate-300" 
                      />
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button onClick={() => refetch()} variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><RefreshCcw className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><MoreVertical className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative w-80 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <Input 
                        placeholder="Search mail" 
                        className="pl-10 h-10 border-none bg-slate-100 focus:bg-white focus:ring-1 focus:ring-blue-100 transition-all rounded-lg text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-xs">1-{filteredEmails.length} of {emails.length}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500"><Settings className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Email Rows */}
                <ScrollArea className="flex-1">
                  {isLoading ? (
                    <div className="p-8 text-center animate-pulse">
                      <div className="h-4 w-1/4 bg-slate-100 rounded mx-auto mb-4" />
                      <div className="space-y-2">
                        {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-55 rounded" />)}
                      </div>
                    </div>
                  ) : filteredEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                      <Inbox className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-sm font-medium">No messages found in your {activeFolder} folder.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredEmails.map((email) => {
                        const hasLead = leads.some(l => l.email?.toLowerCase() === email.recipient_email?.toLowerCase());
                        return (
                          <div 
                            key={email.id}
                            className={cn(
                              "group relative flex items-center px-4 py-2 cursor-pointer transition-all hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] z-0 hover:z-10 bg-white",
                              selectedEmails.includes(email.id) ? "bg-blue-50" : "",
                              !email.is_read ? "bg-white" : "bg-slate-50/30"
                            )}
                            onClick={() => handleEmailClick(email)}
                          >
                            <div className="flex items-center gap-3 w-12 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedEmails.includes(email.id)} 
                                onCheckedChange={() => toggleSelectOne(email.id)} 
                                className="h-4 w-4 border-slate-300" 
                              />
                              <button onClick={(e) => handleStar(email, e)}>
                                <Star className={cn("h-4 w-4 transition-colors", email.is_starred ? "fill-yellow-400 text-yellow-400" : "text-slate-200 hover:text-yellow-400")} />
                              </button>
                            </div>
                            
                            <div className="w-64 flex-shrink-0 truncate pr-4 flex items-center gap-2">
                              <span className={cn("text-sm text-slate-900 truncate", !email.is_read ? "font-bold" : "font-medium")}>
                                {email.recipient_email}
                              </span>
                              {hasLead && (
                                <Badge className="bg-emerald-55 text-emerald-800 text-[8px] font-bold px-1.5 py-0 border-none scale-90">
                                  CRM
                                </Badge>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className={cn("text-sm text-slate-900 whitespace-nowrap", !email.is_read ? "font-bold" : "")}>
                                {email.subject}
                              </span>
                              <span className="text-sm text-slate-400 truncate">— {email.body_html.replace(/<[^>]*>/g, '').slice(0, 100)}...</span>
                            </div>

                            <div className="w-20 text-right flex-shrink-0 group-hover:hidden">
                              <span className="text-xs font-bold text-slate-500">
                                {format(new Date(email.created_at), 'MMM d')}
                              </span>
                            </div>

                            {/* Hover Actions */}
                            <div className="hidden group-hover:flex items-center gap-1 bg-white pl-4 ml-4">
                              <Button onClick={(e) => handleArchive(email.id, e)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100">
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button onClick={(e) => handleMoveToTrash(email.id, e)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100" onClick={e => { e.stopPropagation(); }}>
                                <MailOpen className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100" onClick={e => e.stopPropagation()}>
                                    <Clock3 className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Snooze until...</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => handleSnooze(email.id, 0.25, e)}>Later today (6h)</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleSnooze(email.id, 1, e)}>Tomorrow</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleSnooze(email.id, 7, e)}>Next week</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </main>
        </div>
      </TooltipProvider>

      {/* Compose Modal */}
      <ComposeEmailModal 
        isOpen={isComposeOpen} 
        onClose={() => { setIsComposeOpen(false); setComposeData(null); }} 
        defaultTo={composeData?.to}
        defaultSubject={composeData?.subject}
        defaultBody={composeData?.body}
        draftId={composeData?.id}
      />

      {/* Add Lead Dialog Modal */}
      {isLeadDialogOpen && prefilledLead && (
        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
          <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold">Add Contact as Lead</DialogTitle>
              <DialogDescription className="text-xs">
                Create a new CRM lead for this contact. The email field is locked to preserve connection data.
              </DialogDescription>
            </DialogHeader>
            <LeadForm 
              lead={prefilledLead as any}
              onSubmit={handleLeadSubmit}
              onCancel={() => setIsLeadDialogOpen(false)}
              isLoading={createLead.isPending}
              disableEmailField={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Schedule Meeting Dialog Modal */}
      {isMeetingDialogOpen && matchingLead && (
        <MeetingDialog 
          open={isMeetingDialogOpen} 
          onOpenChange={setIsMeetingDialogOpen}
          onSuccess={fetchMeetingsList}
          prefilledLeadId={matchingLead.id}
          prefilledEmail={matchingLead.email || undefined}
        />
      )}

      {/* Create Task Dialog Modal */}
      {isTaskDialogOpen && matchingLead && (
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">Create CRM Task</DialogTitle>
              <DialogDescription className="text-xs">
                Schedule a follow-up task related to the lead: <strong className="text-slate-800">{matchingLead.contact_name}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTaskSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Task Title *</Label>
                <Input 
                  value={taskTitle} 
                  onChange={e => setTaskTitle(e.target.value)} 
                  placeholder="e.g. Call to discuss quote" 
                  required 
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Due Date</Label>
                <Input 
                  type="date" 
                  value={taskDueDate} 
                  onChange={e => setTaskDueDate(e.target.value)} 
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Priority</Label>
                  <Select value={taskPriority} onValueChange={(v: any) => setTaskPriority(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Assign To</Label>
                  <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Description</Label>
                <Textarea 
                  value={taskDesc} 
                  onChange={e => setTaskDesc(e.target.value)} 
                  placeholder="Notes about this task..." 
                  rows={3} 
                  className="text-xs resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsTaskDialogOpen(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
                  {createTask.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
