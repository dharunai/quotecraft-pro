// Google Integration - Placeholder
// Requires integrations table and Google OAuth setup

import { supabase } from '@/integrations/supabase/client';

export async function connectGoogleWorkspace(): Promise<void> {
    console.warn('Google Workspace integration not yet configured');
    throw new Error('Google Workspace integration not yet configured');
}

export async function disconnectGoogleWorkspace(): Promise<void> {
    console.warn('Google Workspace integration not yet configured');
}

export async function saveGoogleConfig(_clientId: string, _clientSecret: string): Promise<void> {
    console.warn('Google Workspace integration not yet configured');
}

export async function getGoogleIntegrationStatus(): Promise<{
    connected: boolean;
    googleEmail?: string;
    googleName?: string;
    clientId?: string;
    lastSyncAt?: string;
    syncStatus?: string;
}> {
    return { connected: false };
}

export async function syncGmail(): Promise<{ synced: number }> {
    return { synced: 0 };
}

export async function sendGmailEmail(_params: {
    to: string;
    subject: string;
    body: string;
    cc?: string[];
}): Promise<{ messageId: string }> {
    throw new Error('Gmail integration not configured');
}

export async function getGmailMessages(_options: { leadId?: string; limit?: number } = {}) {
    return [];
}

export async function createCalendarEvent(_params: any): Promise<{ eventId: string; meetLink: string | null; htmlLink: string }> {
    throw new Error('Calendar integration not configured');
}

export async function listCalendarEvents(_options: any = {}): Promise<any[]> {
    return [];
}

export async function getLocalCalendarEvents(_options: any = {}) {
    return [];
}
