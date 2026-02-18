import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    Mail, Calendar, MessageSquare, Bot, Plug, RefreshCw,
    CheckCircle2, XCircle, Loader2, ExternalLink, Unplug, Send, Settings2, Key, ChevronRight
} from 'lucide-react';
import {
    connectGoogleWorkspace,
    disconnectGoogleWorkspace,
    getGoogleIntegrationStatus,
    syncGmail,
    saveGoogleConfig
} from '@/lib/googleIntegration';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IntegrationStatus {
    connected: boolean;
    googleEmail?: string;
    googleName?: string;
    clientId?: string;
    lastSyncAt?: string;
    syncStatus?: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ connected, syncStatus }: { connected: boolean; syncStatus?: string }) {
    if (!connected) return <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-600 hover:bg-slate-200"><XCircle className="h-3 w-3" /> Not Connected</Badge>;
    if (syncStatus === 'syncing') return <Badge className="gap-1 bg-blue-500 hover:bg-blue-600"><Loader2 className="h-3 w-3 animate-spin" /> Syncing…</Badge>;
    if (syncStatus === 'error') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
    return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>;
}

// ─── Config Dialog ────────────────────────────────────────────────────────────
function GoogleConfigDialog({
    open,
    onOpenChange,
    onSave,
    existingClientId
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    existingClientId?: string;
}) {
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Reset form when opened
    useEffect(() => {
        if (open) {
            setClientId(existingClientId || '');
            setClientSecret('');
        }
    }, [open, existingClientId]);

    const handleSave = async () => {
        if (!clientId.trim() || !clientSecret.trim()) {
            toast({ title: 'Missing fields', description: 'Client ID and Secret are required', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            await saveGoogleConfig(clientId.trim(), clientSecret.trim());
            toast({ title: 'Configuration saved', description: 'You can now connect your Google account.' });
            onSave();
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: 'Error saving config', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configure Google Workspace</DialogTitle>
                    <DialogDescription>
                        Enter your Google Cloud credentials to enable this integration.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="client-id">Client ID</Label>
                        <Input
                            id="client-id"
                            placeholder="...apps.googleusercontent.com"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="font-mono text-xs"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="client-secret">Client Secret</Label>
                        <Input
                            id="client-secret"
                            type="password"
                            placeholder="GOCSPX-..."
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            className="font-mono text-xs"
                        />
                    </div>

                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-2">
                        <p className="font-medium text-foreground flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Setup Instructions:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline hover:text-primary">Google Cloud Console</a></li>
                            <li>Create <strong>OAuth 2.0 Client ID</strong> (Web application)</li>
                            <li>Add Authorized Redirect URI:</li>
                        </ol>
                        <div className="bg-background border rounded px-2 py-1.5 font-mono break-all select-all">
                            https://anqdcadmweehttbmmdey.supabase.co/functions/v1/google-oauth?action=callback
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Google Workspace Card ────────────────────────────────────────────────────
function GoogleWorkspaceCard() {
    const { toast } = useToast();
    const [status, setStatus] = useState<IntegrationStatus>({ connected: false });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);

    const fetchStatus = async () => {
        try {
            const s = await getGoogleIntegrationStatus();
            setStatus(s);
        } catch {
            // Not connected or error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'google_connected') {
            toast({ title: 'Connected!', description: 'Google Workspace integration is now active.', className: 'bg-green-50 border-green-200' });
            window.history.replaceState({}, '', window.location.pathname);
            fetchStatus();
        }
        if (params.get('error')) {
            toast({ title: 'Connection Failed', description: params.get('error'), variant: 'destructive' });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleConnect = async () => {
        if (!status.clientId) {
            setConfigOpen(true);
            return;
        }

        setConnecting(true);
        try {
            await connectGoogleWorkspace();
        } catch (err: any) {
            toast({ title: 'Connection Error', description: err.message, variant: 'destructive' });
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await disconnectGoogleWorkspace();
            setStatus(prev => ({ ...prev, connected: false }));
            toast({ title: 'Disconnected', description: 'Google Workspace disconnected.' });
            fetchStatus();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setDisconnecting(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const { synced } = await syncGmail();
            toast({ title: 'Sync Complete', description: `${synced} new emails found.` });
            fetchStatus();
        } catch (err: any) {
            toast({ title: 'Sync Failed', description: err.message, variant: 'destructive' });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <>
            <GoogleConfigDialog
                open={configOpen}
                onOpenChange={setConfigOpen}
                onSave={fetchStatus}
                existingClientId={status.clientId}
            />

            <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 to-white border-b">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border shadow-sm flex items-center justify-center p-2.5">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle className="text-lg">Google Workspace</CardTitle>
                                <CardDescription>Sync Gmail, Calendar, and Meet</CardDescription>
                            </div>
                        </div>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
                            <StatusBadge connected={status.connected} syncStatus={status.syncStatus} />
                        )}
                    </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                    {/* Features List */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="p-2 bg-white rounded-md shadow-sm text-blue-600"><Mail className="h-4 w-4" /></div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">Gmail Sync</p>
                                <p className="text-xs text-muted-foreground">Auto-link emails to CRM leads</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="p-2 bg-white rounded-md shadow-sm text-green-600"><Calendar className="h-4 w-4" /></div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">Calendar</p>
                                <p className="text-xs text-muted-foreground">Manage events & Meet links</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="p-2 bg-white rounded-md shadow-sm text-purple-600"><Plug className="h-4 w-4" /></div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">Seamless</p>
                                <p className="text-xs text-muted-foreground">Background sync & updates</p>
                            </div>
                        </div>
                    </div>

                    {status.connected && status.googleEmail && (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-green-100">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                                    {status.googleName?.charAt(0) || 'G'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{status.googleName}</p>
                                    <p className="text-xs text-muted-foreground">{status.googleEmail}</p>
                                </div>
                            </div>
                            {status.lastSyncAt && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground bg-white">
                                    Synced {new Date(status.lastSyncAt).toLocaleTimeString()}
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>

                <Separator />

                <CardFooter className="py-4 bg-slate-50/50 flex flex-wrap gap-3 justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setConfigOpen(true)} className="text-muted-foreground hover:text-foreground">
                        <Settings2 className="h-4 w-4 mr-2" />
                        {status.clientId ? 'Configure Credentials' : 'Setup Credentials'}
                    </Button>

                    <div className="flex gap-2">
                        {!status.connected ? (
                            <Button onClick={handleConnect} disabled={connecting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-2 brightness-0 invert" alt="" />}
                                {connecting ? 'Connecting...' : 'Connect Google Account'}
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={handleSync} disabled={syncing}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                    Sync Now
                                </Button>
                                <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                                    {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unplug className="h-4 w-4 mr-2" />}
                                    Disconnect
                                </Button>
                            </>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </>
    );
}

// ─── Coming Soon Card ─────────────────────────────────────────────────────────
function ComingSoonCard({ icon: Icon, title, description, color, badge }: {
    icon: React.ElementType; title: string; description: string; color: string; badge?: string;
}) {
    return (
        <Card className="opacity-60 hover:opacity-100 transition-opacity border-dashed group cursor-not-allowed bg-slate-50/50">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${color} shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription className="text-xs">{description}</CardDescription>
                        </div>
                    </div>
                    {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
                </div>
            </CardHeader>
        </Card>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IntegrationsSettings() {
    return (
        <AppLayout>
            <div className="max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your third-party connections. Credentials are encrypted and isolated per company.
                    </p>
                </div>

                <div className="grid gap-8">
                    {/* Primary Integrations */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Connected Workspace
                            <Separator className="flex-1" />
                        </h2>
                        <GoogleWorkspaceCard />
                    </div>

                    {/* Upcoming */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Coming Soon
                            <Separator className="flex-1" />
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ComingSoonCard
                                icon={MessageSquare}
                                title="WhatsApp Business"
                                description="Official API integration for automated messaging"
                                color="bg-green-500"
                                badge="Next"
                            />
                            <ComingSoonCard
                                icon={Send}
                                title="Telegram Bot"
                                description="Connect your bot for instant lead notifications"
                                color="bg-sky-500"
                            />
                            <ComingSoonCard
                                icon={Bot}
                                title="AI Assistant"
                                description="Claude 3.5 Sonnet for intelligent insights"
                                color="bg-violet-600"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
