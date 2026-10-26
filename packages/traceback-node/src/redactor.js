/**
 * Sensitive Data Redactor
 * Masks confidential keys, authorization headers, passwords, and tokens.
 */

const DEFAULT_DENYLIST = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'auth',
  'cookie',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'private_key',
  'credit_card',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn'
];

/**
 * Checks if a key matches any pattern in the denylist
 */
function isSensitiveKey(key, customDenylist = []) {
  if (typeof key !== 'string') return false;
  const lower = key.toLowerCase().replace(/[-_]/g, '');
  const combined = [...DEFAULT_DENYLIST, ...customDenylist].map(k => k.toLowerCase().replace(/[-_]/g, ''));
  return combined.some(pattern => lower.includes(pattern));
}

/**
 * Recursively redacts sensitive values from objects and arrays
 * Handles circular references safely using WeakSet.
 */
export function redactSensitiveData(obj, customDenylist = [], visited = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact Bearer tokens in headers
    if (/bearer\s+[a-zA-Z0-9_\-\.]+/i.test(obj)) {
      return obj.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (visited.has(obj)) {
    return '[Circular]';
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, customDenylist, visited));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /bearer\s+[a-zA-Z0-9_\-\.]+/i.test(value)) {
      sanitized[key] = value.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    } else if (isSensitiveKey(key, customDenylist)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = redactSensitiveData(value, customDenylist, visited);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else {
      sanitized[key] = redactSensitiveData(value, customDenylist, visited);
    }
  }

  return sanitized;
}
