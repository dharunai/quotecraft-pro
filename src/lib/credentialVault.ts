// Credential Vault - Placeholder for future integrations
// Tables not yet created, so this is a stub

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
    integration_type: IntegrationType;
    is_enabled: boolean;
    config: Record<string, unknown>;
    credentials: string | Record<string, unknown> | null;
}

export class CredentialVault {
    async getCredentials<T = Record<string, unknown>>(
        _companyId: string,
        _integrationType: IntegrationType
    ): Promise<T> {
        throw new Error('Integrations not yet configured');
    }

    async saveCredentials(
        _companyId: string,
        _integrationType: IntegrationType,
        _credentials: Record<string, unknown>,
    ): Promise<void> {
        console.warn('Integrations table not yet created');
    }

    async isEnabled(_companyId: string, _integrationType: IntegrationType): Promise<boolean> {
        return false;
    }
}

export const credentialVault = new CredentialVault();
