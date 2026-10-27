process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import { config } from '../src/config/index.js';
import { generateFingerprint, normalizeErrorMessage } from '../src/services/fingerprintService.js';
import { validateAndSanitizeEvent, sanitizeContext } from '../src/services/sanitizerService.js';
import { RateLimiter } from '../src/middleware/rateLimiter.js';
import { parseError } from '../../packages/traceback-node/src/stack.js';
import { redactSensitiveData } from '../../packages/traceback-node/src/redactor.js';

describe('Real-World User Edge Cases & Failure Resilience', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // --------------------------------------------------------------------------
  // EDGE CASE 1: Non-Error & Primitive Values Thrown
  // Real users sometimes do `throw "db error"` or `throw null` instead of new Error()
  // --------------------------------------------------------------------------
  describe('Edge Case 1: Thrown Non-Error Values', () => {
    test('safely parses string literal thrown', () => {
      const parsed = parseError('String error message');
      assert.strictEqual(parsed.type, 'UnhandledRejection');
      assert.strictEqual(parsed.message, 'String error message');
      assert.ok(parsed.stackTrace);
    });

    test('safely handles null and undefined thrown without crashing', () => {
      const parsedNull = parseError(null);
      assert.strictEqual(parsedNull.type, 'UnknownError');
      assert.strictEqual(parsedNull.message, 'Unknown error occurred');

      const parsedUndefined = parseError(undefined);
      assert.strictEqual(parsedUndefined.type, 'UnknownError');
      assert.strictEqual(parsedUndefined.message, 'Unknown error occurred');
    });

    test('safely handles custom plain error objects', () => {
      const parsedObj = parseError({ status: 502, reason: 'Bad Gateway' });
      assert.strictEqual(parsedObj.type, 'UnhandledRejection');
      assert.ok(parsedObj.message.includes('Bad Gateway'));
    });
  });

  // --------------------------------------------------------------------------
  // EDGE CASE 2: Circular References in Context
  // Monitored apps often attach Express req, socket, or Mongoose docs with self-references
  // --------------------------------------------------------------------------
  describe('Edge Case 2: Circular Object References in Context', () => {
    test('breaks infinite loop and replaces circular pointer with [Circular]', () => {
      const context = {
        requestId: 'req_123',
        user: { name: 'Alice' }
      };
      // Create circular reference
      context.user.parent = context;
      context.user.self = context.user;

      let sanitized;
      assert.doesNotThrow(() => {
        sanitized = redactSensitiveData(context);
      });

      assert.strictEqual(sanitized.requestId, 'req_123');
      assert.strictEqual(sanitized.user.name, 'Alice');
      assert.strictEqual(sanitized.user.parent, '[Circular]');
      assert.strictEqual(sanitized.user.self, '[Circular]');
    });
  });

  // --------------------------------------------------------------------------
  // EDGE CASE 3: Deeply Nested PII & Authorization Secrets
  // Secrets 5+ levels deep inside nested objects and bearer strings
  // --------------------------------------------------------------------------
  describe('Edge Case 3: Deeply Nested PII Scrubbing', () => {
    test('recursively redacts credentials at any depth', () => {
      const deepPayload = {
        level1: {
          level2: {
            level3: {
              level4: {
                password: 'MyRootPassword#1',
                apiKey: 'tb_live_secret_key',
                jwt: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                creditCard: '4111-2222-3333-4444',
                safeData: 'visible_public_id'
              }
            }
          }
        }
      };

      const sanitized = redactSensitiveData(deepPayload);
      const leaf = sanitized.level1.level2.level3.level4;

      assert.strictEqual(leaf.password, '[REDACTED]');
      assert.strictEqual(leaf.apiKey, '[REDACTED]');
      assert.strictEqual(leaf.jwt, 'Bearer [REDACTED]');
      assert.strictEqual(leaf.creditCard, '[REDACTED]');
      assert.strictEqual(leaf.safeData, 'visible_public_id');
    });
  });

  // --------------------------------------------------------------------------
  // EDGE CASE 4: Dynamic Variable Normalization in SHA-256 Fingerprinting
  // Recurring errors with different user IDs or timestamps must yield identical hash
  // --------------------------------------------------------------------------
  describe('Edge Case 4: Dynamic Parameter Normalization', () => {
    test('normalizes MongoDB ObjectIds, timestamps, and UUIDs to group identical crashes', () => {
      const errorA = {
        type: 'CastError',
        message: 'Cast to ObjectId failed for value "507f191e810c19729de860ea" at path "_id"',
        stackTrace: 'Error: Cast to ObjectId failed\n    at orderService.js:42:15'
      };

      const errorB = {
        type: 'CastError',
        message: 'Cast to ObjectId failed for value "998129384728192837465019" at path "_id"',
        stackTrace: 'Error: Cast to ObjectId failed\n    at orderService.js:42:15'
      };

      const hashA = generateFingerprint(errorA);
      const hashB = generateFingerprint(errorB);

      assert.strictEqual(hashA, hashB, 'Dynamic ObjectIds must group into the exact same fingerprint');
      assert.strictEqual(hashA.length, 64, 'SHA-256 fingerprint must be 64 characters');
    });

    test('normalizes dynamic order numbers and timestamps in messages', () => {
      const msg1 = normalizeErrorMessage('Order #98213 failed at 2026-10-27T14:00:00.000Z');
      const msg2 = normalizeErrorMessage('Order #11204 failed at 2026-10-27T15:30:12.112Z');

      assert.strictEqual(msg1, msg2);
    });
  });

  // --------------------------------------------------------------------------
  // EDGE CASE 5: Malformed & Oversized Payloads
  // Monitored app sending invalid schemas, empty bodies, or oversized data
  // --------------------------------------------------------------------------
  describe('Edge Case 5: Payload Schema Validation', () => {
    test('rejects payload missing error type and message with 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': config.projectKey
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'BadRequest');
    });

    test('rejects request with missing or empty Project Key with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'TypeError',
          message: 'Cannot read properties of null'
        })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Unauthorized');
    });

    test('rejects request with invalid or unknown Project Key with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': 'invalid_unknown_key_999'
        },
        body: JSON.stringify({
          type: 'TypeError',
          message: 'Cannot read properties of null'
        })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Unauthorized');
    });
  });

  // --------------------------------------------------------------------------
  // EDGE CASE 6: Rapid Crash Storm & Rate Limiting
  // --------------------------------------------------------------------------
  describe('Edge Case 6: Rate Limiting During Crash Storms', () => {
    test('enforces rate limits and attaches Retry-After header', () => {
      const limiter = new RateLimiter(60000, 5); // 5 requests max
      const middleware = limiter.middleware();

      const headers = {};
      const res = {
        setHeader(k, v) { headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(b) { this.body = b; return this; }
      };

      const req = { headers: { 'x-project-key': 'edge-case-key' }, ip: '127.0.0.1' };
      let allowed = 0;
      const next = () => { allowed++; };

      // Dispatch 5 requests
      for (let i = 0; i < 5; i++) {
        middleware(req, res, next);
      }
      assert.strictEqual(allowed, 5);

      // 6th request must be blocked
      middleware(req, res, next);
      assert.strictEqual(allowed, 5);
      assert.strictEqual(res.statusCode, 429);
      assert.strictEqual(res.body.error, 'TooManyRequests');
      assert.ok(headers['Retry-After']);
    });
  });
});
