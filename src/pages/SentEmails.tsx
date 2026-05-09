import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSentEmails, SentEmail } from '@/hooks/useSentEmails';
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
  Square,
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
  Trash
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

export default function SentEmails() {
  const { data: emails = [], isLoading, refetch } = useSentEmails();
  const { updateEmailStatus, snoozeEmail } = useEmailActions();
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState('sent');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<{ id?: string, to?: string, subject?: string, body?: string } | null>(null);

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

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Gmail Sidebar */}
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
              /* Gmail Message View */
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

                <ScrollArea className="flex-1">
                  <div className="px-12 py-8 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
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
                      className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans min-h-[400px]"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} 
                    />

                    {selectedEmail.attachments?.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Paperclip className="h-3 w-3" />
                          {selectedEmail.attachments.length} Attachments
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedEmail.attachments.map((file: any, idx: number) => (
                            <div key={idx} className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 hover:border-blue-200 transition-all">
                               <div className="h-24 bg-white border-b border-slate-100 flex items-center justify-center overflow-hidden">
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
              </div>
            ) : (
              /* Gmail Inbox View */
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
                        {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-slate-50 rounded" />)}
                      </div>
                    </div>
                  ) : filteredEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                      <Inbox className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-sm font-medium">No messages found in your {activeFolder} folder.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredEmails.map((email) => (
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
                          
                          <div className="w-64 flex-shrink-0 truncate pr-4">
                            <span className={cn("text-sm text-slate-900", !email.is_read ? "font-bold" : "font-medium")}>
                              {email.recipient_email}
                            </span>
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
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </main>
        </div>
      </TooltipProvider>

      <ComposeEmailModal 
        isOpen={isComposeOpen} 
        onClose={() => { setIsComposeOpen(false); setComposeData(null); }} 
        defaultTo={composeData?.to}
        defaultSubject={composeData?.subject}
        defaultBody={composeData?.body}
        draftId={composeData?.id}
      />
    </AppLayout>
  );
}
