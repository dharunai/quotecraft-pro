import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Unplug,
  Settings2,
  ExternalLink,
  ArrowUpDown,
  Building2,
  BarChart3,
} from 'lucide-react';
import {
  saveHubSpotConfig,
  loadHubSpotConfig,
  clearHubSpotConfig,
  getHubSpotStatus,
  validateHubSpotToken,
  type HubSpotStatus,
} from '@/lib/hubspotIntegration';

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  if (!connected)
    return (
      <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-600 hover:bg-slate-200">
        <XCircle className="h-3 w-3" /> Not Connected
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Connected
    </Badge>
  );
}

// ── HubSpot SVG Logo ──────────────────────────────────────────────────────────

function HubSpotLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FF7A59" />
      <path
        d="M62 38.5V30.5C64.2 29.4 65.8 27.1 65.8 24.4C65.8 20.5 62.6 17.3 58.7 17.3C54.8 17.3 51.6 20.5 51.6 24.4C51.6 27.1 53.2 29.4 55.4 30.5V38.5C52.1 39.1 49.1 40.6 46.7 42.8L26.6 27.2C26.8 26.5 26.9 25.8 26.9 25C26.9 21.1 23.7 18 19.8 18C15.9 18 12.8 21.2 12.8 25C12.8 28.9 16 32 19.8 32C21.1 32 22.3 31.6 23.3 30.9L43 46.2C41.1 49 40 52.4 40 56C40 57.6 40.2 59.1 40.6 60.6L30.1 65.1C29.1 63.5 27.3 62.4 25.3 62.4C22.2 62.4 19.7 64.9 19.7 68C19.7 71.1 22.2 73.6 25.3 73.6C28.4 73.6 30.9 71.1 30.9 68C30.9 67.6 30.8 67.2 30.7 66.8L41 62.4C44.2 67.8 50.1 71.4 56.8 71.4C67 71.4 75.3 63.1 75.3 52.9C75.3 45.7 71.5 39.4 66 36.2L62 38.5ZM58.7 65.3C53 65.3 48.4 60.7 48.4 55C48.4 49.3 53 44.7 58.7 44.7C64.4 44.7 69 49.3 69 55C69 60.7 64.4 65.3 58.7 65.3Z"
        fill="white"
      />
    </svg>
  );
}

// ── Configure Dialog ──────────────────────────────────────────────────────────

function HubSpotConfigDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [privateToken, setPrivateToken] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (open) {
      const cfg = loadHubSpotConfig();
      // Don't pre-fill token for security
      setPrivateToken(cfg ? '••••••••••••••••' : '');
    }
  }, [open]);

  const handleSave = async () => {
    const token = privateToken.replace(/•/g, '').trim();
    if (!token) {
      toast({ title: 'Token required', description: 'Enter your HubSpot Private App token.', variant: 'destructive' });
      return;
    }
    setValidating(true);
    try {
      const { portalId, hubName } = await validateHubSpotToken(token);
      saveHubSpotConfig({
        privateToken: token,
        portalId,
        hubName,
        connectedAt: new Date().toISOString(),
      });
      toast({ title: 'HubSpot connected!', description: `Linked to Portal: ${portalId}` });
      onSave();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Validation failed';
      toast({ title: 'Connection failed', description: msg, variant: 'destructive' });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HubSpotLogo className="w-5 h-5" />
            Configure HubSpot CRM
          </DialogTitle>
          <DialogDescription>
            Connect using a HubSpot Private App token — no OAuth redirect needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="hs-token">
              Private App Access Token <span className="text-red-500">*</span>
            </Label>
            <Input
              id="hs-token"
              type="password"
              placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={privateToken}
              onChange={(e) => setPrivateToken(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Instructions */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> How to create a Private App token:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>
                Go to{' '}
                <a
                  href="https://app.hubspot.com/private-apps"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-primary"
                >
                  HubSpot Private Apps
                </a>
              </li>
              <li>Click <strong>Create a private app</strong></li>
              <li>
                Under <strong>Scopes</strong>, enable:
                <code className="ml-1 bg-background px-1 rounded">crm.objects.deals.read</code> and{' '}
                <code className="bg-background px-1 rounded">crm.objects.deals.write</code>
              </li>
              <li>Click <strong>Create app</strong> → copy the token</li>
            </ol>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Note:</strong> The token is stored locally in your browser. It is never sent to our servers.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={validating}
            className="bg-[#FF7A59] hover:bg-orange-600 text-white"
          >
            {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {validating ? 'Validating…' : 'Connect HubSpot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

export function HubSpotCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<HubSpotStatus>({ connected: false });
  const [configOpen, setConfigOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = () => setStatus(getHubSpotStatus());

  useEffect(() => {
    refresh();
  }, []);

  const handleDisconnect = () => {
    clearHubSpotConfig();
    localStorage.removeItem('hubspot_last_sync');
    localStorage.removeItem('hubspot_last_sync_count');
    setStatus({ connected: false });
    toast({ title: 'HubSpot disconnected' });
  };

  const handleTestSync = async () => {
    setSyncing(true);
    try {
      const { pullDealsFromHubSpot } = await import('@/lib/hubspotIntegration');
      const deals = await pullDealsFromHubSpot();
      toast({ title: 'Connection test passed', description: `Found ${deals.length} deals in HubSpot.` });
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Sync test failed', description: msg, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <HubSpotConfigDialog open={configOpen} onOpenChange={setConfigOpen} onSave={refresh} />

      <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-orange-50/60 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border shadow-sm flex items-center justify-center p-2 flex-shrink-0">
                <HubSpotLogo className="w-full h-full" />
              </div>
              <div>
                <CardTitle className="text-base">HubSpot CRM</CardTitle>
                <CardDescription className="text-xs">
                  Sync deals, contacts & pipeline stages
                </CardDescription>
              </div>
            </div>
            <StatusBadge connected={status.connected} />
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: ArrowUpDown, label: 'Two-Way Sync', desc: 'Push & pull deals', color: 'text-orange-500' },
              { icon: Building2, label: 'Companies', desc: 'Sync company data', color: 'text-amber-500' },
              { icon: BarChart3, label: 'Pipeline', desc: 'Stage mapping', color: 'text-yellow-600' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="p-1.5 bg-white rounded-md shadow-sm flex-shrink-0">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium leading-none mb-0.5">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Connected info */}
          {status.connected && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-green-100">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <HubSpotLogo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{status.hubName ?? `Portal ${status.portalId}`}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Portal ID: {status.portalId}{' '}
                    {status.dealsLastSynced != null && `· ${status.dealsLastSynced} deals synced`}
                  </p>
                </div>
              </div>
              {status.lastSyncAt && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground bg-white">
                  {new Date(status.lastSyncAt).toLocaleString()}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <Separator />

        <CardFooter className="py-3 bg-slate-50/50 flex flex-wrap gap-2 justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfigOpen(true)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {status.connected ? 'Reconfigure' : 'Setup Token'}
          </Button>

          <div className="flex gap-2">
            {status.connected ? (
              <>
                <Button variant="outline" size="sm" onClick={handleTestSync} disabled={syncing} className="text-xs">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Testing…' : 'Test Connection'}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect} className="text-xs">
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setConfigOpen(true)}
                className="bg-[#FF7A59] hover:bg-orange-600 text-white text-xs"
              >
                Connect HubSpot
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
