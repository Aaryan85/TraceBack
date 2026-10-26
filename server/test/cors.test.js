process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';

describe('Production CORS & Preflight Access Control', () => {
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

  const productionOrigin = 'https://traceback-djs9.onrender.com';
  const unapprovedOrigin = 'https://malicious-attacker-domain.com';

  test('OPTIONS preflight for /api/auth/signup from production frontend origin succeeds with 204 and CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'OPTIONS',
      headers: {
        'Origin': productionOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    assert.strictEqual(res.status, 204, 'Preflight request must return 204 No Content');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), productionOrigin, 'Must allow exact production origin');
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true', 'Must allow credentials');
    
    const allowedMethods = res.headers.get('access-control-allow-methods') || '';
    assert.ok(allowedMethods.includes('POST'), 'Must allow POST method');
  });

  test('OPTIONS preflight for /api/auth/me from production frontend origin succeeds with credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        'Origin': productionOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });

    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), productionOrigin);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('POST /api/auth/signup actual request from production frontend returns CORS allow headers', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Origin': productionOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'CORS Test User',
        email: 'invalid-email-to-test-headers',
        password: 'short'
      })
    });

    // Even if validation fails (400), CORS headers must still be present for the approved origin
    assert.strictEqual(res.headers.get('access-control-allow-origin'), productionOrigin);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('OPTIONS preflight from unapproved origin does NOT grant CORS access', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'OPTIONS',
      headers: {
        'Origin': unapprovedOrigin,
        'Access-Control-Request-Method': 'POST'
      }
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notStrictEqual(allowOrigin, unapprovedOrigin, 'Unapproved origin must NOT be allowed');
    assert.notStrictEqual(allowOrigin, '*', 'Wildcard origin must never be returned');
  });

  test('GET request from unapproved origin does NOT receive access-control-allow-origin', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        'Origin': unapprovedOrigin
      }
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notStrictEqual(allowOrigin, unapprovedOrigin);
    assert.notStrictEqual(allowOrigin, '*');
  });

  test('localhost development origin receives appropriate CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });

    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });
});
