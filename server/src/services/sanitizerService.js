/**
 * Ingestion Payload Sanitizer and Validator
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 30000;
const MAX_ROUTE_LENGTH = 500;

const SENSITIVE_KEY_PATTERNS = [
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
 * Server-side deep redaction for incoming context payloads
 */
export function sanitizeContext(obj, visited = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
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
    return obj.map(item => sanitizeContext(item, visited));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    const isSensitive = SENSITIVE_KEY_PATTERNS.some(pat => lowerKey.includes(pat));

    if (typeof value === 'string' && /bearer\s+[a-zA-Z0-9_\-\.]+/i.test(value)) {
      sanitized[key] = value.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    } else if (isSensitive) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeContext(value, visited);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else {
      sanitized[key] = sanitizeContext(value, visited);
    }
  }

  return sanitized;
}

export function validateAndSanitizeEvent(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {
      isValid: false,
      error: 'Payload must be a valid JSON object'
    };
  }

  // Type validation and fallback
  let type = typeof rawPayload.type === 'string' ? rawPayload.type.trim() : null;
  let message = typeof rawPayload.message === 'string' ? rawPayload.message.trim() : null;

  if (!type && !message) {
    return {
      isValid: false,
      error: 'Event payload must contain at least a type or message'
    };
  }

  type = type || 'Error';
  message = message || 'No error message provided';

  // Truncate to safe bounds
  if (message.length > MAX_MESSAGE_LENGTH) {
    message = message.slice(0, MAX_MESSAGE_LENGTH) + '... [TRUNCATED]';
  }

  let stackTrace = typeof rawPayload.stackTrace === 'string' ? rawPayload.stackTrace : null;
  if (stackTrace && stackTrace.length > MAX_STACK_LENGTH) {
    stackTrace = stackTrace.slice(0, MAX_STACK_LENGTH) + '\n... [STACK TRACE TRUNCATED]';
  }

  let route = typeof rawPayload.route === 'string' ? rawPayload.route.trim() : null;
  if (route) {
    // Redact sensitive query parameters in URL
    route = route.replace(/([?&](?:apiKey|token|password|secret)=)[^&]+/gi, '$1[REDACTED]');
    if (route.length > MAX_ROUTE_LENGTH) {
      route = route.slice(0, MAX_ROUTE_LENGTH);
    }
  }

  const environment = typeof rawPayload.environment === 'string'
    ? rawPayload.environment.trim().slice(0, 50)
    : 'development';

  const release = typeof rawPayload.release === 'string'
    ? rawPayload.release.trim().slice(0, 50)
    : 'v1.0.0';

  const service = typeof rawPayload.service === 'string'
    ? rawPayload.service.trim().slice(0, 50)
    : 'api-server';

  const requestId = typeof rawPayload.requestId === 'string'
    ? rawPayload.requestId.trim().slice(0, 100)
    : null;

  const rawContext = (rawPayload.context && typeof rawPayload.context === 'object' && !Array.isArray(rawPayload.context))
    ? rawPayload.context
    : {};

  const context = sanitizeContext(rawContext);

  return {
    isValid: true,
    data: {
      type,
      message,
      stackTrace,
      route,
      service,
      environment,
      release,
      requestId,
      context
    }
  };
}
