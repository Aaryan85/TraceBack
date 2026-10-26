process.env.NODE_ENV = 'test';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';

describe('Server Health Checks', () => {
  test('app exports Express instance with routes', () => {
    assert.ok(app);
    assert.strictEqual(typeof app.listen, 'function');
  });

  test('health endpoint logic returns valid payload structure', async () => {
    // Simulated mock req/res invocation of the health handler logic
    let statusCode = 0;
    let responseBody = null;

    const mockReq = {};
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        responseBody = payload;
        return this;
      }
    };

    // Find the health route handler
    const healthRoute = app._router.stack.find(
      (layer) => layer.route && layer.route.path === '/api/health'
    );

    assert.ok(healthRoute, 'Route /api/health must be registered');
    
    // Invoke the handler
    const handler = healthRoute.route.stack[0].handle;
    handler(mockReq, mockRes);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody.status, 'ok');
    assert.strictEqual(responseBody.service, 'traceback-server');
    assert.ok(responseBody.timestamp);
  });
});
