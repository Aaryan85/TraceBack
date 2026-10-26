process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import { config } from '../src/config/index.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { Issue } from '../src/models/Issue.js';
import { ErrorEvent } from '../src/models/ErrorEvent.js';

describe('Stage 4 — Ingestion & Dashboard REST APIs', () => {
  let server;
  let baseUrl;
  let isDbAvailable = false;

  before(async () => {
    // Attempt DB connection for integration testing
    try {
      const conn = await connectDB(config.mongoUri);
      if (conn && conn.readyState === 1) {
        isDbAvailable = true;
      }
    } catch {
      isDbAvailable = false;
    }

    // Start ephemeral server on random available port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

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
      // Clean up test data
      await Issue.deleteMany({ projectKey: config.projectKey });
      await ErrorEvent.deleteMany({ projectKey: config.projectKey });
      await disconnectDB();
    }
  });

  describe('Authentication & Ingestion Validation', () => {
    test('POST /api/v1/events rejects requests without project key (401)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'TypeError', message: 'test' })
      });

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.error, 'Unauthorized');
    });

    test('POST /api/v1/events rejects invalid project key (401)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': 'invalid_secret_key'
        },
        body: JSON.stringify({ type: 'TypeError', message: 'test' })
      });

      assert.strictEqual(res.status, 401);
    });

    test('POST /api/v1/events accepts Authorization: Bearer <key>', async (t) => {
      if (!isDbAvailable) {
        t.skip('Skipping DB write test: local MongoDB daemon offline');
        return;
      }

      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.projectKey}`
        },
        body: JSON.stringify({ type: 'AuthorizationTestError', message: 'Bearer token test' })
      });

      assert.strictEqual(res.status, 201);
    });

    test('POST /api/v1/events rejects project key placed only in req.body (401)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectKey: config.projectKey, // in body, should be rejected
          type: 'TypeError',
          message: 'test'
        })
      });

      assert.strictEqual(res.status, 401, 'Credentials in body must not authenticate');
    });

    test('POST /api/v1/events rejects malformed payloads without type/message (400)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': config.projectKey
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.error, 'BadRequest');
    });
  });

  describe('Ingestion Grouping, Deduplication & Persistence', () => {
    test('groups recurring identical errors and increments occurrence count', async (t) => {
      if (!isDbAvailable) {
        t.skip('Skipping DB persistence test: local MongoDB daemon offline');
        return;
      }

      const samplePayload = {
        type: 'TypeError',
        message: 'Cannot read properties of null (reading \'toUpperCase\')',
        stackTrace: 'TypeError: Cannot read properties of null\n    at /app/routes/demo.js:42:15',
        route: 'GET /error/type-error',
        environment: 'production',
        release: 'v1.2.4'
      };

      // First ingestion: Creates new Issue
      const res1 = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': config.projectKey
        },
        body: JSON.stringify(samplePayload)
      });

      assert.strictEqual(res1.status, 201);
      const body1 = await res1.json();
      assert.strictEqual(body1.status, 'success');
      assert.strictEqual(body1.data.count, 1);
      assert.strictEqual(body1.data.isNewIssue, true);
      const issueId = body1.data.issueId;

      // Second ingestion with identical error: Increments count on the SAME Issue
      const res2 = await fetch(`${baseUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Key': config.projectKey
        },
        body: JSON.stringify(samplePayload)
      });

      assert.strictEqual(res2.status, 201);
      const body2 = await res2.json();
      assert.strictEqual(body2.data.issueId, issueId, 'Must group under the exact same Issue ID');
      assert.strictEqual(body2.data.count, 2, 'Occurrence count must increment to 2');
      assert.strictEqual(body2.data.isNewIssue, false);

      // Verify that 2 individual ErrorEvent records were persisted
      const eventCount = await ErrorEvent.countDocuments({ issueId });
      assert.strictEqual(eventCount, 2, 'Both occurrence instances must be stored in ErrorEvent');
    });
  });

  describe('Dashboard Endpoints', () => {
    test('GET /api/issues returns paginated issue list', async (t) => {
      if (!isDbAvailable) {
        t.skip('Skipping DB query test: local MongoDB daemon offline');
        return;
      }

      const res = await fetch(`${baseUrl}/api/issues?status=all`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      assert.ok(Array.isArray(body.issues));
      assert.ok(body.pagination);
      assert.strictEqual(typeof body.pagination.total, 'number');
    });

    test('PATCH /api/issues/:id/status updates status and rejects invalid status values', async (t) => {
      if (!isDbAvailable) {
        t.skip('Skipping DB query test: local MongoDB daemon offline');
        return;
      }

      const issue = await Issue.findOne({ projectKey: config.projectKey });
      if (!issue) {
        t.skip('No test issue available');
        return;
      }

      // Rejects invalid status
      const badRes = await fetch(`${baseUrl}/api/issues/${issue._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'destroyed' })
      });
      assert.strictEqual(badRes.status, 400);

      // Updates to resolved
      const goodRes = await fetch(`${baseUrl}/api/issues/${issue._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      assert.strictEqual(goodRes.status, 200);
      const updated = await goodRes.json();
      assert.strictEqual(updated.issue.status, 'resolved');
    });

    test('GET /api/analytics/error-frequency returns summary and 24h hourly buckets', async (t) => {
      if (!isDbAvailable) {
        t.skip('Skipping DB query test: local MongoDB daemon offline');
        return;
      }

      const res = await fetch(`${baseUrl}/api/analytics/error-frequency`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      assert.ok(body.summary);
      assert.strictEqual(typeof body.summary.totalIssues, 'number');
      assert.strictEqual(typeof body.summary.events24h, 'number');
      assert.ok(Array.isArray(body.frequency));
      assert.strictEqual(body.frequency.length, 24);
    });
  });
});
