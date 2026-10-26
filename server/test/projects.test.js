process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import { config } from '../src/config/index.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { User, Session, Project, Issue, ErrorEvent } from '../src/models/index.js';

describe('Phase 4 & 5 — Multi-Project Workspace & Isolation', () => {
  let server;
  let baseUrl;
  let isDbAvailable = false;

  let userACookie = '';
  let userBCookie = '';
  let projectAId = '';
  let projectAKey = '';
  let projectBId = '';

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

    if (isDbAvailable) {
      const existingUsers = await User.find({ email: { $regex: /user[ab]_/ } }).lean();
      const existingIds = existingUsers.map((u) => u._id);
      if (existingIds.length > 0) {
        await User.deleteMany({ _id: { $in: existingIds } });
        await Session.deleteMany({ userId: { $in: existingIds } });
        const projects = await Project.find({ owner: { $in: existingIds } }).lean();
        const projectIds = projects.map((p) => p._id);
        await Project.deleteMany({ _id: { $in: projectIds } });
        await Issue.deleteMany({ projectId: { $in: projectIds } });
        await ErrorEvent.deleteMany({ projectId: { $in: projectIds } });
      }

      // Create User A
      const resA = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User A', email: `usera_${Date.now()}@test.com`, password: 'Password123!' })
      });
      userACookie = resA.headers.get('set-cookie').split(';')[0];
      const dataA = await resA.json();
      projectAId = dataA.defaultProject._id;
      projectAKey = dataA.defaultProject.apiKey;

      // Create User B
      const resB = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User B', email: `userb_${Date.now()}@test.com`, password: 'Password123!' })
      });
      userBCookie = resB.headers.get('set-cookie').split(';')[0];
      const dataB = await resB.json();
      projectBId = dataB.defaultProject._id;
    }
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (isDbAvailable) {
      const users = await User.find({ email: { $regex: /user[ab]_/ } }).lean();
      const userIds = users.map((u) => u._id);
      await User.deleteMany({ _id: { $in: userIds } });
      await Session.deleteMany({ userId: { $in: userIds } });
      const projects = await Project.find({ owner: { $in: userIds } }).lean();
      const projectIds = projects.map((p) => p._id);
      await Project.deleteMany({ _id: { $in: projectIds } });
      await Issue.deleteMany({ projectId: { $in: projectIds } });
      await ErrorEvent.deleteMany({ projectId: { $in: projectIds } });
      await disconnectDB();
    }
  });

  test('GET /api/projects rejects unauthenticated requests (401)', async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    assert.strictEqual(res.status, 401);
  });

  test('POST /api/projects creates a new project with unique API key (201)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie
      },
      body: JSON.stringify({
        name: 'Billing Microservice',
        description: 'Processes credit cards and invoices'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.project.name, 'Billing Microservice');
    assert.ok(body.project.apiKey.startsWith('tb_live_'));
  });

  test('GET /api/projects lists only projects belonging to authenticated user', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    // User A has 2 projects (default + billing)
    const resA = await fetch(`${baseUrl}/api/projects`, {
      headers: { Cookie: userACookie }
    });
    const bodyA = await resA.json();
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(bodyA.projects.length, 2);

    // User B has only 1 project (default)
    const resB = await fetch(`${baseUrl}/api/projects`, {
      headers: { Cookie: userBCookie }
    });
    const bodyB = await resB.json();
    assert.strictEqual(resB.status, 200);
    assert.strictEqual(bodyB.projects.length, 1);
  });

  test('Cross-User Protection: User B cannot access User A project details (404/403)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/projects/${projectAId}`, {
      headers: { Cookie: userBCookie } // User B attempting to view User A's project
    });

    assert.strictEqual(res.status, 404);
  });

  test('Cross-User Protection: User B cannot delete User A project (404/403)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/projects/${projectAId}`, {
      method: 'DELETE',
      headers: { Cookie: userBCookie }
    });

    assert.strictEqual(res.status, 404);
  });

  test('POST /api/projects/:id/rotate-key generates new apiKey for owner', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/projects/${projectAId}/rotate-key`, {
      method: 'POST',
      headers: { Cookie: userACookie }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.notStrictEqual(body.project.apiKey, projectAKey);
    projectAKey = body.project.apiKey; // update to new key
  });

  test('Ingestion API accepts events authenticated with rotated dynamic project key (201)', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    const res = await fetch(`${baseUrl}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Key': projectAKey
      },
      body: JSON.stringify({
        type: 'TypeError',
        message: 'Cannot read property of dynamic project event',
        stackTrace: 'TypeError: at file.js:10:5',
        environment: 'production'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.ok(body.data.issueId);
  });

  test('Dashboard issue isolation: User A sees ingested issue, User B sees none', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping DB test: MongoDB offline');
      return;
    }

    // User A querying their project sees the issue
    const resA = await fetch(`${baseUrl}/api/issues?projectId=${projectAId}`, {
      headers: { Cookie: userACookie }
    });
    const bodyA = await resA.json();
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(bodyA.issues.length, 1);
    assert.strictEqual(bodyA.issues[0].message, 'Cannot read property of dynamic project event');

    // User B querying their project sees 0 issues
    const resB = await fetch(`${baseUrl}/api/issues?projectId=${projectBId}`, {
      headers: { Cookie: userBCookie }
    });
    const bodyB = await resB.json();
    assert.strictEqual(resB.status, 200);
    assert.strictEqual(bodyB.issues.length, 0);

    // User B attempting to query User A's projectId is rejected with 403 Forbidden
    const crossRes = await fetch(`${baseUrl}/api/issues?projectId=${projectAId}`, {
      headers: { Cookie: userBCookie }
    });
    assert.strictEqual(crossRes.status, 403);
  });
});
