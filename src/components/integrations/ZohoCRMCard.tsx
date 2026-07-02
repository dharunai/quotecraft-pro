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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  saveZohoConfig,
  loadZohoConfig,
  clearZohoConfig,
  getZohoStatus,
  validateZohoToken,
  type ZohoDataCenter,
  type ZohoStatus,
} from '@/lib/zohoCrmIntegration';

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

// ── Configure Dialog ──────────────────────────────────────────────────────────

function ZohoConfigDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [dataCenter, setDataCenter] = useState<ZohoDataCenter>('com');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (open) {
      const cfg = loadZohoConfig();
      setClientId(cfg?.clientId ?? '');
      setClientSecret('');
      setAccessToken('');
      setRefreshToken('');
      setDataCenter(cfg?.dataCenter ?? 'com');
    }
  }, [open]);

  const handleSave = async () => {
    if (!accessToken.trim()) {
      toast({ title: 'Access token required', description: 'Paste your Zoho OAuth Access Token.', variant: 'destructive' });
      return;
    }
    setValidating(true);
    try {
      const { orgName } = await validateZohoToken(accessToken.trim(), dataCenter);
      saveZohoConfig({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        accessToken: accessToken.trim(),
        refreshToken: refreshToken.trim() || undefined,
        dataCenter,
        orgName,
        connectedAt: new Date().toISOString(),
      });
      toast({ title: 'Zoho CRM connected!', description: `Linked to: ${orgName}` });
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-[#E42527] font-black text-lg">Z</span> Configure Zoho CRM
          </DialogTitle>
          <DialogDescription>
            Connect using a Zoho OAuth Access Token (Self-Client or Server-Based OAuth).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Data Center */}
          <div className="space-y-1.5">
            <Label>Data Center</Label>
            <Select value={dataCenter} onValueChange={(v) => setDataCenter(v as ZohoDataCenter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="com">United States (zoho.com)</SelectItem>
                <SelectItem value="eu">Europe (zoho.eu)</SelectItem>
                <SelectItem value="in">India (zoho.in)</SelectItem>
                <SelectItem value="com.au">Australia (zoho.com.au)</SelectItem>
                <SelectItem value="jp">Japan (zoho.jp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Access Token */}
          <div className="space-y-1.5">
            <Label htmlFor="zoho-token">
              Access Token <span className="text-red-500">*</span>
            </Label>
            <Input
              id="zoho-token"
              type="password"
              placeholder="1000.xxxxxxxxxxxxxxxx..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Refresh Token (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="zoho-refresh">Refresh Token (optional)</Label>
            <Input
              id="zoho-refresh"
              type="password"
              placeholder="1000.xxxxxxxxxxxxxxxx..."
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Client ID / Secret (optional for token validation) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="zoho-cid">Client ID (optional)</Label>
              <Input
                id="zoho-cid"
                placeholder="1000.XXXXX..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zoho-secret">Client Secret (optional)</Label>
              <Input
                id="zoho-secret"
                type="password"
                placeholder="xxxxxxxx..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Help */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> How to get your Access Token:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>
                Go to{' '}
                <a
                  href="https://api-console.zoho.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-primary"
                >
                  Zoho API Console
                </a>
              </li>
              <li>Create a <strong>Self Client</strong> application</li>
              <li>Generate token with scope: <code className="bg-background px-1 rounded">ZohoCRM.modules.ALL</code></li>
              <li>Paste the generated Access Token above</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={validating}
            className="bg-[#E42527] hover:bg-red-700 text-white"
          >
            {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {validating ? 'Validating…' : 'Connect Zoho CRM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

export function ZohoCRMCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ZohoStatus>({ connected: false });
  const [configOpen, setConfigOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = () => setStatus(getZohoStatus());

  useEffect(() => {
    refresh();
  }, []);

  const handleDisconnect = () => {
    clearZohoConfig();
    localStorage.removeItem('zoho_last_sync');
    localStorage.removeItem('zoho_last_sync_count');
    setStatus({ connected: false });
    toast({ title: 'Zoho CRM disconnected' });
  };

  const handleTestSync = async () => {
    setSyncing(true);
    try {
      // Import lazily to avoid circular deps at module load time
      const { pullDealsFromZoho } = await import('@/lib/zohoCrmIntegration');
      const deals = await pullDealsFromZoho();
      toast({ title: 'Connection test passed', description: `Found ${deals.length} deals in Zoho CRM.` });
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
      <ZohoConfigDialog open={configOpen} onOpenChange={setConfigOpen} onSave={refresh} />

      <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-red-50/60 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Zoho Logo */}
              <div className="w-12 h-12 rounded-xl bg-white border shadow-sm flex items-center justify-center p-1 flex-shrink-0">
                <svg viewBox="0 0 120 40" className="w-full">
                  <text x="4" y="30" fontFamily="Arial Black, sans-serif" fontSize="28" fontWeight="900" fill="#E42527">Z</text>
                  <text x="26" y="30" fontFamily="Arial, sans-serif" fontSize="18" fill="#333">oho</text>
                  <text x="66" y="30" fontFamily="Arial, sans-serif" fontSize="12" fill="#E42527">CRM</text>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Zoho CRM</CardTitle>
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
              { icon: ArrowUpDown, label: 'Two-Way Sync', desc: 'Push & pull deals', color: 'text-red-600' },
              { icon: Building2, label: 'Accounts', desc: 'Sync company data', color: 'text-orange-500' },
              { icon: BarChart3, label: 'Pipeline', desc: 'Stage mapping', color: 'text-amber-500' },
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
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-[#E42527] font-black text-sm">
                  Z
                </div>
                <div>
                  <p className="text-sm font-medium">{status.orgName ?? 'Zoho Organization'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {status.dealsLastSynced != null
                      ? `${status.dealsLastSynced} deals synced`
                      : 'Ready to sync'}
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
            {status.connected ? 'Reconfigure' : 'Setup Credentials'}
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
                className="bg-[#E42527] hover:bg-red-700 text-white text-xs"
              >
                Connect Zoho CRM
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
