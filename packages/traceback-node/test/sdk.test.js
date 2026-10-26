import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TraceBack } from '../src/index.js';
import { redactSensitiveData } from '../src/redactor.js';
import { parseError, parseStackFrames } from '../src/stack.js';

describe('TraceBack Node.js SDK', () => {
  describe('Sensitive Data Redactor', () => {
    test('redacts blacklisted keys from objects and nested arrays', () => {
      const payload = {
        username: 'alice',
        password: 'super-secret-password-123',
        auth: {
          token: 'jwt-token-9842',
          apiKey: 'secret_live_api_key'
        },
        metadata: {
          cardNumber: '4111-2222-3333-4444'
        },
        items: [
          { secretNote: 'classified', validNote: 'public' }
        ]
      };

      const sanitized = redactSensitiveData(payload);

      assert.strictEqual(sanitized.username, 'alice');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.auth.token, '[REDACTED]');
      assert.strictEqual(sanitized.auth.apiKey, '[REDACTED]');
      assert.strictEqual(sanitized.metadata.cardNumber, '[REDACTED]');
      assert.strictEqual(sanitized.items[0].secretNote, '[REDACTED]');
      assert.strictEqual(sanitized.items[0].validNote, 'public');
    });

    test('redacts Bearer tokens in header strings', () => {
      const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';
      const sanitized = redactSensitiveData(header);
      assert.strictEqual(sanitized, 'Bearer [REDACTED]');
    });

    test('safely handles circular references without infinite recursion', () => {
      const circularObj = { name: 'Root' };
      circularObj.self = circularObj;

      assert.doesNotThrow(() => {
        const result = redactSensitiveData(circularObj);
        assert.strictEqual(result.self, '[Circular]');
      });
    });
  });

  describe('Stack Trace Parser', () => {
    test('parses Error object into structured details', () => {
      const error = new TypeError('Cannot read properties of undefined');
      const parsed = parseError(error);

      assert.strictEqual(parsed.type, 'TypeError');
      assert.strictEqual(parsed.message, 'Cannot read properties of undefined');
      assert.ok(parsed.stackTrace.includes('TypeError: Cannot read properties of undefined'));
      assert.ok(Array.isArray(parsed.frames));
      assert.ok(parsed.frames.length > 0);
    });

    test('handles non-Error thrown objects safely', () => {
      const parsedString = parseError('String literal thrown');
      assert.strictEqual(parsedString.type, 'UnhandledRejection');
      assert.strictEqual(parsedString.message, 'String literal thrown');

      const parsedObj = parseError({ code: 500, detail: 'Server exploded' });
      assert.strictEqual(parsedObj.type, 'UnhandledRejection');
      assert.ok(parsedObj.message.includes('500'));
    });
  });

  describe('SDK Facade & Fail-Safe Event Construction', () => {
    test('initializes and constructs sanitized exception payload', () => {
      TraceBack.init({
        endpoint: 'http://localhost:3000/api/v1/events',
        projectKey: 'tb_test_key_123',
        environment: 'staging',
        release: 'v2.1.0',
        service: 'billing-api'
      });

      const err = new RangeError('Index out of bounds');
      const event = TraceBack.captureException(err, {
        route: 'GET /api/checkout',
        userId: 'usr_42',
        password: 'should_be_redacted'
      });

      assert.ok(event);
      assert.strictEqual(event.projectKey, 'tb_test_key_123');
      assert.strictEqual(event.type, 'RangeError');
      assert.strictEqual(event.message, 'Index out of bounds');
      assert.strictEqual(event.environment, 'staging');
      assert.strictEqual(event.release, 'v2.1.0');
      assert.strictEqual(event.route, 'GET /api/checkout');
      assert.strictEqual(event.context.userId, 'usr_42');
      assert.strictEqual(event.context.password, '[REDACTED]');
      assert.ok(event.context.runtime.platform);
    });

    test('captureMessage constructs message event with level', () => {
      TraceBack.init({
        endpoint: 'http://localhost:3000/api/v1/events',
        projectKey: 'tb_test_key_123'
      });

      const event = TraceBack.captureMessage('Database connection retry exceeded', 'warning', {
        retries: 3
      });

      assert.ok(event);
      assert.strictEqual(event.type, 'Message:WARNING');
      assert.strictEqual(event.message, 'Database connection retry exceeded');
      assert.strictEqual(event.context.level, 'warning');
      assert.strictEqual(event.context.retries, 3);
    });

    test('fail-safe: captureException never throws even with malformed input', () => {
      assert.doesNotThrow(() => {
        TraceBack.captureException(null);
        TraceBack.captureException(undefined);
      });
    });
  });
});
