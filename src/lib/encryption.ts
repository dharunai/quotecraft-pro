import CryptoJS from 'crypto-js';

// IMPORTANT: Set VITE_ENCRYPTION_KEY in your .env file
// Generate with: openssl rand -hex 32
const ENCRYPTION_KEY =
    import.meta.env.VITE_ENCRYPTION_KEY ||
    'default-32-char-key-change-in-prod!!';

/**
 * Encrypts any serializable value using AES-256.
 * Returns a base64-encoded ciphertext string.
 */
export function encryptData(data: unknown): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
}

/**
 * Decrypts a previously encrypted string back to the original value.
 * Returns null if decryption fails (e.g. wrong key or corrupted data).
 */
export function decryptData<T = unknown>(encrypted: string): T | null {
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        const jsonString = bytes.toString(CryptoJS.enc.Utf8);
        if (!jsonString) return null;
        return JSON.parse(jsonString) as T;
    } catch {
        console.error('[Encryption] Failed to decrypt data');
        return null;
    }
}

/**
 * Quick helper: checks whether a string looks like AES-encrypted ciphertext.
 * (CryptoJS AES output always starts with "U2FsdGVk" in base64)
 */
export function isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith('U2FsdGVk');
}
