import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  syncPipelineWithZoho,
  pullDealsFromZoho,
  getZohoStatus,
  type QuoteCraftDeal as ZohoDeal,
  type ZohoDealImport,
} from '@/lib/zohoCrmIntegration';
import {
  syncPipelineWithHubSpot,
  pullDealsFromHubSpot,
  getHubSpotStatus,
  type QuoteCraftDeal as HubSpotDeal,
  type HubSpotDealImport,
} from '@/lib/hubspotIntegration';

// ─────────────────────────────────────────────────────────────────────────────
// useSyncWithZoho
// ─────────────────────────────────────────────────────────────────────────────

export function useSyncWithZoho() {
  return useMutation({
    mutationFn: async (deals: ZohoDeal[]) => {
      const status = getZohoStatus();
      if (!status.connected) {
        throw new Error('Zoho CRM is not connected. Go to Settings → Integrations to configure it.');
      }
      return syncPipelineWithZoho(deals);
    },
    onSuccess: ({ pushed, errors }) => {
      if (errors === 0) {
        toast.success(`Zoho CRM sync complete — ${pushed} deal${pushed !== 1 ? 's' : ''} pushed.`);
      } else {
        toast.warning(`Zoho CRM sync done — ${pushed} pushed, ${errors} failed.`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Zoho sync failed: ${err.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// usePullFromZoho
// ─────────────────────────────────────────────────────────────────────────────

export function usePullFromZoho() {
  return useMutation({
    mutationFn: async (): Promise<ZohoDealImport[]> => {
      const status = getZohoStatus();
      if (!status.connected) {
        throw new Error('Zoho CRM is not connected. Go to Settings → Integrations to configure it.');
      }
      return pullDealsFromZoho();
    },
    onSuccess: (deals) => {
      toast.success(`Pulled ${deals.length} deal${deals.length !== 1 ? 's' : ''} from Zoho CRM.`);
    },
    onError: (err: Error) => {
      toast.error(`Zoho pull failed: ${err.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useSyncWithHubSpot
// ─────────────────────────────────────────────────────────────────────────────

export function useSyncWithHubSpot() {
  return useMutation({
    mutationFn: async (deals: HubSpotDeal[]) => {
      const status = getHubSpotStatus();
      if (!status.connected) {
        throw new Error('HubSpot is not connected. Go to Settings → Integrations to configure it.');
      }
      return syncPipelineWithHubSpot(deals);
    },
    onSuccess: ({ pushed, errors }) => {
      if (errors === 0) {
        toast.success(`HubSpot sync complete — ${pushed} deal${pushed !== 1 ? 's' : ''} pushed.`);
      } else {
        toast.warning(`HubSpot sync done — ${pushed} pushed, ${errors} failed.`);
      }
    },
    onError: (err: Error) => {
      toast.error(`HubSpot sync failed: ${err.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// usePullFromHubSpot
// ─────────────────────────────────────────────────────────────────────────────

export function usePullFromHubSpot() {
  return useMutation({
    mutationFn: async (): Promise<HubSpotDealImport[]> => {
      const status = getHubSpotStatus();
      if (!status.connected) {
        throw new Error('HubSpot is not connected. Go to Settings → Integrations to configure it.');
      }
      return pullDealsFromHubSpot();
    },
    onSuccess: (deals) => {
      toast.success(`Pulled ${deals.length} deal${deals.length !== 1 ? 's' : ''} from HubSpot.`);
    },
    onError: (err: Error) => {
      toast.error(`HubSpot pull failed: ${err.message}`);
    },
  });
}
