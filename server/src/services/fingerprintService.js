import crypto from 'crypto';

/**
 * Normalizes an error message by stripping dynamic tokens
 * (UUIDs, hexadecimal addresses, dynamic numbers, timestamps)
 */
export function normalizeErrorMessage(message) {
  if (!message || typeof message !== 'string') return 'Unknown error';

  return message
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '{UUID}') // UUIDs
    .replace(/0x[0-9a-fA-F]+/g, '{HEX}') // Memory addresses
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g, '{TIMESTAMP}') // ISO dates
    .replace(/\d+(?:\.\d+)?(?:ms|s|m|h|px|em|rem|kb|mb|gb|bytes)?\b/gi, '{N}') // Numbers with optional units (e.g. 5000ms, 12kb)
    .replace(/\b\d+\b/g, '{N}') // Standalone numbers
    .replace(/\s+/g, ' ') // Collapse extra whitespace
    .trim();
}

/**
 * Extracts top application-level frames from stack trace for fingerprinting
 */
export function extractFingerprintFrames(stackTrace, maxFrames = 3) {
  if (!stackTrace || typeof stackTrace !== 'string') return [];

  const lines = stackTrace.split('\n');
  const appFrames = [];

  // V8 stack frame pattern
  const frameRegex = /^\s*at\s+(?:(.+?)\s+\((.*?):(\d+):(\d+)\)|(.*?):(\d+):(\d+))$/;

  for (const line of lines) {
    const match = line.match(frameRegex);
    if (!match) continue;

    const fnName = match[1] || '<anonymous>';
    const rawPath = match[2] || match[4] || '';
    const lineNum = match[3] || match[5] || '';

    const normalizedPath = rawPath.replace(/\\/g, '/');

    // Skip node internals
    if (
      normalizedPath.startsWith('node:') ||
      normalizedPath.startsWith('internal/') ||
      normalizedPath.includes('node:internal') ||
      !normalizedPath.includes('/')
    ) {
      continue;
    }

    // Skip node_modules to prioritize application code frames
    if (normalizedPath.includes('node_modules')) {
      continue;
    }

    // Use relative path segment for consistency across machines/deployments
    const pathParts = normalizedPath.split('/');
    const relativePath = pathParts.slice(-3).join('/');

    appFrames.push(`${fnName}@${relativePath}:${lineNum}`);
    if (appFrames.length >= maxFrames) break;
  }

  return appFrames;
}

/**
 * Generates a deterministic SHA-256 fingerprint for error grouping.
 * Combines normalized exception type, normalized message, and call frames.
 * Does NOT include request IDs, timestamps, or client IPs.
 */
export function generateFingerprint({ type, message, stackTrace = '' }) {
  const normalizedType = (type || 'Error').trim();
  const normalizedMsg = normalizeErrorMessage(message);
  const frames = extractFingerprintFrames(stackTrace);

  const signature = frames.length > 0
    ? `${normalizedType}:::${normalizedMsg}:::${frames.join('|')}`
    : `${normalizedType}:::${normalizedMsg}`;

  return crypto
    .createHash('sha256')
    .update(signature)
    .digest('hex');
}
