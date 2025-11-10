import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Generate salt from user ID
 */
function generateSalt(userId: string): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-me';
  return crypto
    .createHash('sha256')
    .update(`${userId}-${secret}`)
    .digest()
    .slice(0, SALT_LENGTH);
}

/**
 * Derive encryption key from user ID
 */
async function deriveKey(userId: string): Promise<Buffer> {
  const salt = generateSalt(userId);
  const password = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-change-me';

  if (!password || password === 'default-master-key-change-me') {
    throw new Error('MASTER_ENCRYPTION_KEY not configured in environment');
  }

  return (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt session key private key
 * @param sessionKey - Session key private key (base64 encoded)
 * @param userId - User ID for salt generation
 * @returns Object with encrypted data and IV
 */
export async function encryptSessionKey(
  sessionKey: string,
  userId: string
): Promise<{ encrypted: string; iv: string }> {
  try {
    const key = await deriveKey(userId);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(sessionKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine encrypted data + auth tag
    const combined = encrypted + authTag.toString('hex');

    return {
      encrypted: combined,
      iv: iv.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Failed to encrypt session key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt session key private key
 * @param encryptedData - Encrypted session key (includes auth tag)
 * @param iv - Initialization vector
 * @param userId - User ID for salt generation
 * @returns Decrypted session key (base64 encoded)
 */
export async function decryptSessionKey(
  encryptedData: string,
  iv: string,
  userId: string
): Promise<string> {
  try {
    const key = await deriveKey(userId);

    // Split encrypted data and auth tag
    const authTag = Buffer.from(encryptedData.slice(-TAG_LENGTH * 2), 'hex');
    const encrypted = encryptedData.slice(0, -TAG_LENGTH * 2);

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt session key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear sensitive data from memory (best effort in JS)
 * @param data - Sensitive string to clear
 */
export function clearSensitiveData(data: string): void {
  if (data) {
    // This is a best-effort attempt in JavaScript
    // The actual memory will be garbage collected eventually
    for (let i = 0; i < data.length; i++) {
      data = data.substring(0, i) + '0' + data.substring(i + 1);
    }
  }
}
