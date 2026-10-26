process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import { config } from '../src/config/index.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { User, Session, Project } from '../src/models/index.js';

describe('Phase 2 — User Authentication & Session Management', () => {
  let server;
  let baseUrl;
  let isDbAvailable = false;
  const testEmail = `test_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let sessionCookie = '';

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
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (isDbAvailable) {
      const testUsers = await User.find({ email: { $regex: /test_user_/ } }).lean();
      const testUserIds = testUsers.map((u) => u._id);
      await User.deleteMany({ _id: { $in: testUserIds } });
      await Session.deleteMany({ userId: { $in: testUserIds } });
      await Project.deleteMany({ owner: { $in: testUserIds } });
      await disconnectDB();
    }
  });

  test('POST /api/auth/signup rejects missing or invalid inputs (400)', async () => {
    // Missing name
    const res1 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@example.com', password: 'password123' })
    });
    assert.strictEqual(res1.status, 400);

    // Invalid email
    const res2 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User', email: 'invalid-email', password: 'password123' })
    });
    assert.strictEqual(res2.status, 400);

    // Password too short (< 8 chars)
    const res3 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User', email: 'valid@example.com', password: 'short' })
    });
    assert.strictEqual(res3.status, 400);
  });

  test('POST /api/auth/signup successfully registers user, creates session & initial project (201)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Engineer',
        email: testEmail,
        password: testPassword
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.user.email, testEmail);
    assert.ok(body.user._id);
    assert.strictEqual(body.user.passwordHash, undefined, 'Password hash must never be returned');
    assert.ok(body.defaultProject.apiKey.startsWith('tb_live_'));

    // Extract set-cookie
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('tb_session='));
    sessionCookie = setCookie.split(';')[0];
  });

  test('POST /api/auth/signup rejects duplicate email registration (409 Conflict)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Engineer',
        email: testEmail,
        password: testPassword
      })
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error, 'Conflict');
  });

  test('POST /api/auth/login rejects incorrect password (401)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!'
      })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, 'Unauthorized');
  });

  test('POST /api/auth/login succeeds with valid credentials (200)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.user.email, testEmail);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('tb_session='));
    sessionCookie = setCookie.split(';')[0];
  });

  test('GET /api/auth/me returns authenticated user data when session cookie provided (200)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.user.email, testEmail);
  });

  test('GET /api/auth/me rejects unauthenticated requests without session (401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, 'Unauthorized');
  });

  test('POST /api/auth/logout invalidates session and clears cookie (200)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: sessionCookie }
    });

    assert.strictEqual(res.status, 200);

    // Verify session is invalidated
    const verifyRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie }
    });
    assert.strictEqual(verifyRes.status, 401);
  });
});
