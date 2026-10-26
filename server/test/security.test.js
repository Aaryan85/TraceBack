process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import { config } from '../src/config/index.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { Issue } from '../src/models/Issue.js';
import { ErrorEvent } from '../src/models/ErrorEvent.js';
import { RateLimiter } from '../src/middleware/rateLimiter.js';
import { sanitizeContext } from '../src/services/sanitizerService.js';

describe('Stage 6 — Security, Rate Limiting & Data Protection', () => {
  let server;
  let baseUrl;
  let isDbAvailable = false;

  before(async () => {
    try {
      const conn = await connectDB(config.mongoUri);
      if (conn && conn.readyState === 1) {
        isDbAvailable = true;
      }
    } catch {
      isDbAvailable = false;
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}`;

    if (isDbAvailable) {
      await Issue.deleteMany({ projectKey: config.projectKey });
      await ErrorEvent.deleteMany({ projectKey: config.projectKey });
    }
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (isDbAvailable) {
      await Issue.deleteMany({ projectKey: config.projectKey });
      await ErrorEvent.deleteMany({ projectKey: config.projectKey });
      await disconnectDB();
    }
  });

  describe('Rate Limiter Behavior', () => {
    test('enforces rate limits and sets Retry-After header upon exhaustion', () => {
      const limiter = new RateLimiter(60000, 3); // 3 requests per minute limit
      const middleware = limiter.middleware();

      const headers = {};
      const res = {
        setHeader(k, v) { headers[k] = v; },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(b) { this.body = b; return this; }
      };

      const req = { headers: { 'x-project-key': 'test-limiter-key' }, ip: '127.0.0.1' };
      let passed = 0;
      const next = () => { passed++; };

      // 1st request -> ok
      middleware(req, res, next);
      assert.strictEqual(passed, 1);
      assert.strictEqual(headers['X-RateLimit-Remaining'], 2);

      // 2nd request -> ok
      middleware(req, res, next);
      assert.strictEqual(passed, 2);
      assert.strictEqual(headers['X-RateLimit-Remaining'], 1);

      // 3rd request -> ok
      middleware(req, res, next);
      assert.strictEqual(passed, 3);
      assert.strictEqual(headers['X-RateLimit-Remaining'], 0);

      // 4th request -> Rate limit exceeded (429)
      middleware(req, res, next);
      assert.strictEqual(passed, 3, '4th request must be blocked');
      assert.strictEqual(res.statusCode, 429);
      assert.strictEqual(res.body.error, 'TooManyRequests');
      assert.ok(headers['Retry-After']);
    });
  });

  describe('Payload Limits & Sanitization', () => {
    test('rejects payloads exceeding the 100kb body parser limit (413)', async () => {
      // Create a payload string slightly larger than 100kb
      const hugeString = 'x'.repeat(105 * 1024);
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': config.projectKey
        },
        body: JSON.stringify({
          type: 'HugePayloadError',
          message: hugeString
        })
      });

      assert.strictEqual(res.status, 413, 'Oversized requests must receive 413 Payload Too Large');
    });

    test('sanitizeContext recursively scrubs passwords, tokens, and authorization strings', () => {
      const sensitiveContext = {
        user: 'alice',
        password: 'plain-text-secret-password',
        auth: {
          token: 'jwt.token.here',
          apiKey: 'sk_live_12345'
        },
        headers: {
          authorization: 'Bearer secret_access_token_value_9876'
        },
        normalData: {
          theme: 'dark',
          version: '1.0'
        }
      };

      const sanitized = sanitizeContext(sensitiveContext);

      assert.strictEqual(sanitized.user, 'alice');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.auth.token, '[REDACTED]');
      assert.strictEqual(sanitized.auth.apiKey, '[REDACTED]');
      assert.strictEqual(sanitized.headers.authorization, 'Bearer [REDACTED]');
      assert.strictEqual(sanitized.normalData.theme, 'dark');
    });
  });

  describe('Cross-Project Isolation', () => {
    test('dashboard endpoints strictly scope queries to the project key', async (t) => {
      if (!isDbAvailable) {
        t.skip('Skipping DB query test: local MongoDB daemon offline');
        return;
      }

      // Insert an issue belonging to a foreign project
      const foreignProjectKey = 'foreign_project_unauthorized_key_999';
      await Issue.create({
        projectKey: foreignProjectKey,
        fingerprint: 'foreign_fingerprint_hash_999999',
        type: 'ForeignSecurityBreachError',
        message: 'This should never be exposed to another project'
      });

      // Query dashboard issues as the demo project
      const res = await fetch(`${baseUrl}/api/issues?status=all`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      // Ensure NO issues from foreign project are returned
      const leaked = data.issues.some(i => i.projectKey === foreignProjectKey);
      assert.strictEqual(leaked, false, 'Foreign project issues must never leak into dashboard');

      // Cleanup
      await Issue.deleteMany({ projectKey: foreignProjectKey });
    });
  });
});
