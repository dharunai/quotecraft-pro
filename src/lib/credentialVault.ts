import { supabase } from '@/integrations/supabase/client';
import { encryptData, decryptData, isEncrypted } from './encryption';

export type IntegrationType =
    | 'google_workspace'
    | 'gmail'
    | 'google_calendar'
    | 'google_meet'
    | 'google_drive'
    | 'whatsapp'
    | 'telegram'
    | 'ai_assistant';

export type LogStatus = 'success' | 'failed' | 'pending';

export interface IntegrationRecord {
    id: string;
    company_id: string;
    integration_type: IntegrationType;
    is_enabled: boolean;
    config: Record<string, unknown>;
    credentials: string | Record<string, unknown> | null;
    connected_by: string | null;
    connected_at: string | null;
    last_sync_at: string | null;
    sync_status: 'idle' | 'syncing' | 'error';
    error_message: string | null;
}

export class CredentialVault {
    /**
     * Retrieve decrypted credentials for a company's integration.
     * Throws if the integration is not found or disabled.
     */
    async getCredentials<T = Record<string, unknown>>(
        companyId: string,
        integrationType: IntegrationType
    ): Promise<T> {
        const { data, error } = await supabase
            .from('integrations')
            .select('credentials, config')
            .eq('company_id', companyId)
            .eq('integration_type', integrationType)
            .eq('is_enabled', true)
            .single();

        if (error || !data) {
            throw new Error(`${integrationType} is not configured for this company`);
        }

        const raw = data.credentials;

        // If stored as encrypted string, decrypt it
        if (typeof raw === 'string' && isEncrypted(raw)) {
            const decrypted = decryptData<T>(raw);
            if (!decrypted) throw new Error('Failed to decrypt credentials');
            return decrypted;
        }

        // Fallback: return as-is (plain object or config)
        return (raw ?? data.config) as T;
    }

    /**
     * Save (upsert) encrypted credentials for a company's integration.
     */
    async saveCredentials(
        companyId: string,
        integrationType: IntegrationType,
        credentials: Record<string, unknown>,
        config?: Record<string, unknown>,
        userId?: string
    ): Promise<void> {
        const encryptedCredentials = encryptData(credentials);

        const { error } = await supabase.from('integrations').upsert(
            {
                company_id: companyId,
                integration_type: integrationType,
                credentials: encryptedCredentials,
                config: config ?? {},
                is_enabled: true,
                connected_by: userId ?? null,
                connected_at: new Date().toISOString(),
                sync_status: 'idle',
                error_message: null,
            },
            { onConflict: 'company_id,integration_type' }
        );

        if (error) throw error;
    }

    /**
     * Fetch the full integration record (without decrypting credentials).
     */
    async getIntegration(
        companyId: string,
        integrationType: IntegrationType
    ): Promise<IntegrationRecord | null> {
        const { data } = await supabase
            .from('integrations')
            .select('*')
            .eq('company_id', companyId)
            .eq('integration_type', integrationType)
            .single();

        return data as IntegrationRecord | null;
    }

    /**
     * Fetch all integrations for a company.
     */
    async getAllIntegrations(companyId: string): Promise<IntegrationRecord[]> {
        const { data } = await supabase
            .from('integrations')
            .select('*')
            .eq('company_id', companyId)
            .order('integration_type');

        return (data ?? []) as IntegrationRecord[];
    }

    /**
     * Check whether a specific integration is enabled.
     */
    async isEnabled(companyId: string, integrationType: IntegrationType): Promise<boolean> {
        const { data } = await supabase
            .from('integrations')
            .select('is_enabled')
            .eq('company_id', companyId)
            .eq('integration_type', integrationType)
            .single();

        return data?.is_enabled ?? false;
    }

    /**
     * Disable an integration and wipe its stored credentials.
     */
    async disableIntegration(companyId: string, integrationType: IntegrationType): Promise<void> {
        const { error } = await supabase
            .from('integrations')
            .update({
                is_enabled: false,
                credentials: null,
                connected_at: null,
                connected_by: null,
                sync_status: 'idle',
                error_message: null,
            })
            .eq('company_id', companyId)
            .eq('integration_type', integrationType);

        if (error) throw error;
    }

    /**
     * Update the sync status and optional error message.
     */
    async updateSyncStatus(
        companyId: string,
        integrationType: IntegrationType,
        status: 'idle' | 'syncing' | 'error',
        errorMessage?: string
    ): Promise<void> {
        await supabase
            .from('integrations')
            .update({
                sync_status: status,
                error_message: errorMessage ?? null,
                last_sync_at: status === 'idle' ? new Date().toISOString() : undefined,
            })
            .eq('company_id', companyId)
            .eq('integration_type', integrationType);
    }

    /**
     * Log an integration activity event.
     */
    async logActivity(
        companyId: string,
        integrationType: IntegrationType,
        eventType: string,
        status: LogStatus,
        details?: {
            integrationId?: string;
            entityType?: string;
            entityId?: string;
            request?: unknown;
            response?: unknown;
            error?: string;
        }
    ): Promise<void> {
        const { error } = await supabase.from('integration_logs').insert({
            company_id: companyId,
            integration_id: details?.integrationId ?? null,
            integration_type: integrationType,
            event_type: eventType,
            entity_type: details?.entityType ?? null,
            entity_id: details?.entityId ?? null,
            status,
            request_data: details?.request ?? null,
            response_data: details?.response ?? null,
            error_message: details?.error ?? null,
        });

        if (error) {
            console.error('[CredentialVault] Failed to log activity:', error);
        }
    }
}

// Singleton export
export const credentialVault = new CredentialVault();
