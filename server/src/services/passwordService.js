import crypto from 'crypto';

/**
 * Hash a plaintext password using Node.js native crypto.scrypt
 * @param {string} password Plaintext password
 * @returns {Promise<string>} Format: "salt:derivedKeyHex"
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a plaintext password against a stored salt:hash string
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 * @param {string} password Plaintext password to verify
 * @param {string} storedHash Stored "salt:derivedKeyHex"
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }

    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const matches = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(matches);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Generate a cryptographically secure random session ID
 */
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a cryptographically secure project ingestion key
 * Prefix: "tb_live_" + 32 hex chars
 */
export function generateProjectKey() {
  return `tb_live_${crypto.randomBytes(16).toString('hex')}`;
}
