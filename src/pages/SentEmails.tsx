import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSentEmails, SentEmail } from '@/hooks/useSentEmails';
import { Card, CardContent } from '@/components/ui/card';
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
  Inbox
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function SentEmails() {
  const { data: emails = [], isLoading } = useSentEmails();
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmails = emails.filter(email => 
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.recipient_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-100px)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Mailing History</h1>
              <p className="text-sm text-slate-500">Track all outgoing professional communications</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search emails..."
              className="pl-9 h-9 text-xs rounded-full border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Email List */}
          <div className={cn(
            "flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col transition-all",
            selectedEmail ? "hidden md:flex md:max-w-md lg:max-w-lg" : "flex"
          )}>
            <div className="px-4 py-3 border-b bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sent Messages</span>
              <Badge variant="outline" className="text-[10px] bg-white">{filteredEmails.length} messages</Badge>
            </div>
            
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-8 text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-slate-400">Loading your history...</p>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-12 text-center">
                  <Inbox className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">No emails found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={cn(
                        "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 group",
                        selectedEmail?.id === email.id ? "bg-blue-50/50" : ""
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-800 truncate">{email.recipient_email}</span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                            {format(new Date(email.created_at), 'MMM d, p')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 truncate mb-1">{email.subject}</p>
                        <div className="flex items-center gap-2">
                          {email.attachments?.length > 0 && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-1">
                              <Paperclip className="h-2.5 w-2.5" />
                              {email.attachments.length}
                            </Badge>
                          )}
                          <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                            Sent to client regarding {email.entity_type || 'lead'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-slate-300 mt-1 transition-transform",
                        selectedEmail?.id === email.id ? "translate-x-1 text-blue-400" : ""
                      )} />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Email View */}
          <div className={cn(
            "flex-[2] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col",
            !selectedEmail ? "hidden md:flex items-center justify-center bg-slate-50/30" : "flex"
          )}>
            {selectedEmail ? (
              <>
                <div className="px-6 py-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden" 
                      onClick={() => setSelectedEmail(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <h2 className="text-base font-bold text-slate-800">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-blue-600">{selectedEmail.recipient_email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(selectedEmail.created_at), 'PPPP p')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <ArrowLeft className="h-3.5 w-3.5" /> Reply
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-8 bg-white">
                  <div className="max-w-3xl mx-auto">
                    {/* Header Details */}
                    <div className="mb-8 p-4 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            <User className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">To Recipient</p>
                            <p className="text-sm font-semibold text-slate-800">{selectedEmail.recipient_email}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Status</p>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] h-5">Delivered</Badge>
                       </div>
                    </div>

                    {/* Email Content */}
                    <div className="prose prose-sm max-w-none min-h-[300px] text-slate-700 leading-relaxed font-sans"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} 
                    />

                    {/* Attachments */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-12 pt-6 border-t">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-blue-500" />
                          Attachments ({selectedEmail.attachments.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedEmail.attachments.map((file: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 truncate">{file.filename}</p>
                                  <p className="text-[10px] text-slate-400">Attached File</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] opacity-0 group-hover:opacity-100">Download</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="text-center p-12 max-w-md">
                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                  <Mail className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Select a message</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Choose an email from the list to view its full content, recipients, and any attachments sent.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
