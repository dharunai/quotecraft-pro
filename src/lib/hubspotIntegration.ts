// ─────────────────────────────────────────────────────────────────────────────
// HubSpot CRM Integration
// Uses HubSpot CRM API v3 with a Private App Token
// Credentials are stored in localStorage — consistent with the project pattern.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hubspot_crm_config';
const HUBSPOT_BASE = 'https://api.hubapi.com';

export interface HubSpotConfig {
  privateToken: string;
  portalId?: string;
  hubName?: string;
  connectedAt?: string;
}

export interface HubSpotStatus {
  connected: boolean;
  portalId?: string;
  hubName?: string;
  lastSyncAt?: string;
  dealsLastSynced?: number;
}

// ── Persist / load ────────────────────────────────────────────────────────────

export function saveHubSpotConfig(config: HubSpotConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadHubSpotConfig(): HubSpotConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HubSpotConfig) : null;
  } catch {
    return null;
  }
}

export function clearHubSpotConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getHubSpotStatus(): HubSpotStatus {
  const config = loadHubSpotConfig();
  if (!config?.privateToken) return { connected: false };
  const lastSync = localStorage.getItem('hubspot_last_sync') || undefined;
  const count = Number(localStorage.getItem('hubspot_last_sync_count') || 0);
  return {
    connected: true,
    portalId: config.portalId,
    hubName: config.hubName,
    lastSyncAt: lastSync,
    dealsLastSynced: count,
  };
}

// ── Stage mapping ─────────────────────────────────────────────────────────────
// QuoteCraft → HubSpot default deal stage IDs
// Default HubSpot pipeline: appointmentscheduled → qualifiedtobuy → presentationscheduled → decisionmakerboughtin → contractsent → closedwon | closedlost

const STAGE_TO_HUBSPOT: Record<string, string> = {
  qualified: 'qualifiedtobuy',
  proposal: 'presentationscheduled',
  negotiation: 'contractsent',
  won: 'closedwon',
  lost: 'closedlost',
};

const HUBSPOT_TO_STAGE: Record<string, string> = {
  appointmentscheduled: 'qualified',
  qualifiedtobuy: 'qualified',
  presentationscheduled: 'proposal',
  decisionmakerboughtin: 'proposal',
  contractsent: 'negotiation',
  closedwon: 'won',
  closedlost: 'lost',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── Deal push ─────────────────────────────────────────────────────────────────

export interface QuoteCraftDeal {
  id: string;
  deal_value?: number | null;
  stage: string;
  expected_close_date?: string | null;
  lead?: {
    company_name?: string | null;
    contact_name?: string | null;
    email?: string | null;
  } | null;
}

export async function pushDealToHubSpot(deal: QuoteCraftDeal): Promise<{ hubspotId: string }> {
  const config = loadHubSpotConfig();
  if (!config?.privateToken) throw new Error('HubSpot is not connected. Please configure it in Settings → Integrations.');

  const closeDate = deal.expected_close_date
    ? new Date(deal.expected_close_date).getTime()
    : Date.now() + 30 * 86400000;

  const payload = {
    properties: {
      dealname: deal.lead?.company_name
        ? `${deal.lead.company_name} Deal`
        : `Deal ${deal.id.slice(0, 8)}`,
      amount: String(deal.deal_value ?? 0),
      dealstage: STAGE_TO_HUBSPOT[deal.stage] ?? 'qualifiedtobuy',
      closedate: String(closeDate),
      description: `Synced from QuoteCraft Pro — ID: ${deal.id}`,
      pipeline: 'default',
    },
  };

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: headers(config.privateToken),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`HubSpot API error ${res.status}: ${err?.message ?? res.statusText}`);
  }

  const json = await res.json();
  return { hubspotId: String(json?.id ?? '') };
}

// ── Batch push ────────────────────────────────────────────────────────────────

export async function syncPipelineWithHubSpot(deals: QuoteCraftDeal[]): Promise<{ pushed: number; errors: number }> {
  let pushed = 0;
  let errors = 0;

  for (const deal of deals) {
    try {
      await pushDealToHubSpot(deal);
      pushed++;
    } catch {
      errors++;
    }
  }

  localStorage.setItem('hubspot_last_sync', new Date().toISOString());
  localStorage.setItem('hubspot_last_sync_count', String(pushed));

  return { pushed, errors };
}

// ── Pull from HubSpot ─────────────────────────────────────────────────────────

export interface HubSpotDealImport {
  hubspotId: string;
  dealName: string;
  amount: number;
  stage: string;
  closeDate?: string;
}

export async function pullDealsFromHubSpot(): Promise<HubSpotDealImport[]> {
  const config = loadHubSpotConfig();
  if (!config?.privateToken) throw new Error('HubSpot is not connected.');

  const res = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate&limit=50`,
    { headers: headers(config.privateToken) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`HubSpot API error ${res.status}: ${err?.message ?? res.statusText}`);
  }

  const json = await res.json();
  const results: Record<string, Record<string, string>>[] = json?.results ?? [];

  return results.map((d) => ({
    hubspotId: String(d.id ?? ''),
    dealName: d.properties?.dealname ?? '',
    amount: Number(d.properties?.amount ?? 0),
    stage: HUBSPOT_TO_STAGE[d.properties?.dealstage ?? ''] ?? 'qualified',
    closeDate: d.properties?.closedate
      ? new Date(Number(d.properties.closedate)).toISOString().split('T')[0]
      : undefined,
  }));
}

// ── Validate token (fetch account info) ───────────────────────────────────────

export async function validateHubSpotToken(token: string): Promise<{ portalId: string; hubName: string }> {
  const res = await fetch(`${HUBSPOT_BASE}/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Invalid HubSpot token (HTTP ${res.status}). Make sure your Private App has CRM scopes.`);
  }

  const json = await res.json();
  return {
    portalId: String(json?.portalId ?? ''),
    hubName: String(json?.uiDomain ?? json?.portalId ?? 'HubSpot Portal'),
  };
}
