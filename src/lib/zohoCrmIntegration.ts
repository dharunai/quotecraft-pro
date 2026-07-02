// ─────────────────────────────────────────────────────────────────────────────
// Zoho CRM Integration
// Uses Zoho CRM REST API v7 with an OAuth Access Token (or Self-Client token)
// Credentials are stored in localStorage — consistent with the project pattern.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'zoho_crm_config';

export type ZohoDataCenter = 'com' | 'eu' | 'in' | 'com.au' | 'jp';

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  dataCenter: ZohoDataCenter;
  orgName?: string;
  connectedAt?: string;
}

export interface ZohoStatus {
  connected: boolean;
  orgName?: string;
  dataCenter?: ZohoDataCenter;
  lastSyncAt?: string;
  dealsLastSynced?: number;
}

// ── Persist / load ────────────────────────────────────────────────────────────

export function saveZohoConfig(config: ZohoConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadZohoConfig(): ZohoConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ZohoConfig) : null;
  } catch {
    return null;
  }
}

export function clearZohoConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getZohoStatus(): ZohoStatus {
  const config = loadZohoConfig();
  if (!config || !config.accessToken) return { connected: false };
  const lastSync = localStorage.getItem('zoho_last_sync') || undefined;
  const count = Number(localStorage.getItem('zoho_last_sync_count') || 0);
  return {
    connected: true,
    orgName: config.orgName,
    dataCenter: config.dataCenter,
    lastSyncAt: lastSync,
    dealsLastSynced: count,
  };
}

// ── Zoho base URL ─────────────────────────────────────────────────────────────

function baseUrl(dc: ZohoDataCenter): string {
  return `https://www.zohoapis.${dc}/crm/v7`;
}

// ── Stage mapping ─────────────────────────────────────────────────────────────
// QuoteCraft → Zoho stage names (customise to match your Zoho pipeline)

const STAGE_TO_ZOHO: Record<string, string> = {
  qualified: 'Qualification',
  proposal: 'Needs Analysis',
  negotiation: 'Negotiation/Review',
  won: 'Closed Won',
  lost: 'Closed Lost',
};

const ZOHO_TO_STAGE: Record<string, string> = {
  Qualification: 'qualified',
  'Needs Analysis': 'proposal',
  'Value Proposition': 'proposal',
  'Id. Decision Makers': 'proposal',
  'Perception Analysis': 'negotiation',
  'Negotiation/Review': 'negotiation',
  'Closed Won': 'won',
  'Closed Lost': 'lost',
};

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

export async function pushDealToZoho(deal: QuoteCraftDeal): Promise<{ zohoId: string }> {
  const config = loadZohoConfig();
  if (!config?.accessToken) throw new Error('Zoho CRM is not connected. Please configure it in Settings → Integrations.');

  const payload = {
    data: [
      {
        Deal_Name: deal.lead?.company_name
          ? `${deal.lead.company_name} Deal`
          : `Deal ${deal.id.slice(0, 8)}`,
        Amount: deal.deal_value ?? 0,
        Stage: STAGE_TO_ZOHO[deal.stage] ?? 'Qualification',
        Closing_Date: deal.expected_close_date ?? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        Account_Name: deal.lead?.company_name ?? 'Unknown Company',
        Description: `Synced from QuoteCraft Pro — ID: ${deal.id}`,
        Tag: [{ name: 'quotecraft-sync' }],
      },
    ],
    trigger: [],
  };

  const res = await fetch(`${baseUrl(config.dataCenter)}/Deals`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Zoho API error ${res.status}: ${err?.message ?? res.statusText}`);
  }

  const json = await res.json();
  const zohoId: string = json?.data?.[0]?.details?.id ?? '';
  return { zohoId };
}

// ── Batch push ────────────────────────────────────────────────────────────────

export async function syncPipelineWithZoho(deals: QuoteCraftDeal[]): Promise<{ pushed: number; errors: number }> {
  let pushed = 0;
  let errors = 0;

  for (const deal of deals) {
    try {
      await pushDealToZoho(deal);
      pushed++;
    } catch {
      errors++;
    }
  }

  localStorage.setItem('zoho_last_sync', new Date().toISOString());
  localStorage.setItem('zoho_last_sync_count', String(pushed));

  return { pushed, errors };
}

// ── Pull from Zoho ────────────────────────────────────────────────────────────

export interface ZohoDealImport {
  zohoId: string;
  dealName: string;
  amount: number;
  stage: string;
  closingDate?: string;
  accountName?: string;
}

export async function pullDealsFromZoho(): Promise<ZohoDealImport[]> {
  const config = loadZohoConfig();
  if (!config?.accessToken) throw new Error('Zoho CRM is not connected.');

  const res = await fetch(
    `${baseUrl(config.dataCenter)}/Deals?fields=Deal_Name,Amount,Stage,Closing_Date,Account_Name&per_page=50`,
    {
      headers: { Authorization: `Zoho-oauthtoken ${config.accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Zoho API error ${res.status}: ${err?.message ?? res.statusText}`);
  }

  const json = await res.json();
  const rawDeals: Record<string, unknown>[] = json?.data ?? [];

  return rawDeals.map((d) => ({
    zohoId: String(d.id ?? ''),
    dealName: String(d.Deal_Name ?? ''),
    amount: Number(d.Amount ?? 0),
    stage: ZOHO_TO_STAGE[String(d.Stage ?? '')] ?? 'qualified',
    closingDate: d.Closing_Date ? String(d.Closing_Date) : undefined,
    accountName: d.Account_Name ? String(d.Account_Name) : undefined,
  }));
}

// ── Validate token (lightweight org info call) ────────────────────────────────

export async function validateZohoToken(accessToken: string, dc: ZohoDataCenter): Promise<{ orgName: string }> {
  const res = await fetch(`https://www.zohoapis.${dc}/crm/v7/org`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Invalid token or wrong data center (HTTP ${res.status})`);

  const json = await res.json();
  const orgName: string = json?.org?.[0]?.company_name ?? 'Zoho Organization';
  return { orgName };
}
