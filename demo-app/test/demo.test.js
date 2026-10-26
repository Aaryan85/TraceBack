process.env.NODE_ENV = 'test';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Demo Monitored Express Application', () => {
  test('exports configured Express instance', () => {
    assert.ok(app);
    assert.strictEqual(typeof app.listen, 'function');
  });

  test('health route returns 200 OK', async () => {
    const healthRoute = app._router.stack.find(
      (layer) => layer.route && layer.route.path === '/health'
    );
    assert.ok(healthRoute, 'Health route should be registered');

    let status = 0;
    let jsonBody = null;
    const req = {};
    const res = {
      status(s) { status = s; return this; },
      json(b) { jsonBody = b; return this; }
    };

    healthRoute.route.stack[0].handle(req, res);
    assert.strictEqual(status, 200);
    assert.strictEqual(jsonBody.status, 'ok');
  });

  test('type error route catches null reference and calls error middleware', async () => {
    const typeErrorRoute = app._router.stack.find(
      (layer) => layer.route && layer.route.path === '/error/type-error'
    );
    assert.ok(typeErrorRoute);

    let nextError = null;
    const req = {};
    const res = { json() {} };
    const next = (err) => { nextError = err; };

    typeErrorRoute.route.stack[0].handle(req, res, next);
    assert.ok(nextError instanceof TypeError);
    assert.ok(nextError.message.includes('Cannot read properties of null'));
  });

  test('validation error route triggers TraceBack capture and returns 400', async () => {
    const valRoute = app._router.stack.find(
      (layer) => layer.route && layer.route.path === '/error/validation-error'
    );
    assert.ok(valRoute);

    let status = 0;
    let jsonBody = null;
    const req = {};
    const res = {
      status(s) { status = s; return this; },
      json(b) { jsonBody = b; return this; }
    };

    valRoute.route.stack[0].handle(req, res, () => {});
    assert.strictEqual(status, 400);
    assert.strictEqual(jsonBody.capturedByTraceBack, true);
  });

  test('simulated database error route returns 503 and captures event', async () => {
    const dbRoute = app._router.stack.find(
      (layer) => layer.route && layer.route.path === '/error/db-sim'
    );
    assert.ok(dbRoute);

    let status = 0;
    let jsonBody = null;
    const req = {};
    const res = {
      status(s) { status = s; return this; },
      json(b) { jsonBody = b; return this; }
    };

    dbRoute.route.stack[0].handle(req, res, () => {});
    assert.strictEqual(status, 503);
    assert.strictEqual(jsonBody.error, 'DatabaseTimeoutError');
    assert.strictEqual(jsonBody.capturedByTraceBack, true);
  });
});
