process.env.NODE_ENV = 'test';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateFingerprint,
  normalizeErrorMessage,
  extractFingerprintFrames
} from '../src/services/fingerprintService.js';

describe('Deterministic Error Fingerprinting', () => {
  describe('normalizeErrorMessage', () => {
    test('normalizes dynamic numbers to {N}', () => {
      const msg1 = 'Order 48291 failed after 3 attempts';
      const msg2 = 'Order 99104 failed after 3 attempts';

      assert.strictEqual(normalizeErrorMessage(msg1), normalizeErrorMessage(msg2));
      assert.strictEqual(normalizeErrorMessage(msg1), 'Order {N} failed after {N} attempts');
    });

    test('normalizes UUIDs to {UUID}', () => {
      const msg1 = 'User 123e4567-e89b-12d3-a456-426614174000 not found';
      const msg2 = 'User 987fcdeb-51a2-43f1-b987-123456789abc not found';

      assert.strictEqual(normalizeErrorMessage(msg1), normalizeErrorMessage(msg2));
      assert.strictEqual(normalizeErrorMessage(msg1), 'User {UUID} not found');
    });

    test('normalizes hex memory addresses to {HEX}', () => {
      const msg1 = 'Pointer dereference failed at 0x7ffd5e2b34a0';
      const msg2 = 'Pointer dereference failed at 0x1a2b3c4d';

      assert.strictEqual(normalizeErrorMessage(msg1), normalizeErrorMessage(msg2));
    });
  });

  describe('extractFingerprintFrames', () => {
    test('filters node internals and prioritizes application stack frames', () => {
      const stack = `TypeError: Cannot read properties of undefined
    at getUserProfile (/app/src/services/user.js:42:15)
    at handleRequest (/app/src/controllers/auth.js:89:10)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at next (/app/node_modules/express/lib/router/route.js:144:13)
    at node:internal/process/task_queues:95:5`;

      const frames = extractFingerprintFrames(stack);

      assert.strictEqual(frames.length, 2);
      assert.ok(frames[0].includes('getUserProfile@src/services/user.js:42'));
      assert.ok(frames[1].includes('handleRequest@src/controllers/auth.js:89'));
    });
  });

  describe('generateFingerprint', () => {
    test('generates identical SHA-256 fingerprint for recurring identical errors', () => {
      const errorA = {
        type: 'TypeError',
        message: 'Cannot read properties of null (reading \'name\')',
        stackTrace: 'TypeError: Cannot read properties of null\n    at formatUser (/app/src/utils.js:14:20)'
      };

      const errorB = {
        type: 'TypeError',
        message: 'Cannot read properties of null (reading \'name\')',
        stackTrace: 'TypeError: Cannot read properties of null\n    at formatUser (/app/src/utils.js:14:20)'
      };

      const hashA = generateFingerprint(errorA);
      const hashB = generateFingerprint(errorB);

      assert.strictEqual(hashA, hashB);
      assert.strictEqual(hashA.length, 64, 'SHA-256 output must be 64 hex characters');
    });

    test('produces identical fingerprint even when dynamic numbers vary', () => {
      const error1 = {
        type: 'DatabaseTimeoutError',
        message: 'Query timed out after 5000ms: SELECT * FROM users WHERE id = 42',
        stackTrace: 'Error: Query timed out\n    at executeQuery (/app/src/db.js:100:12)'
      };

      const error2 = {
        type: 'DatabaseTimeoutError',
        message: 'Query timed out after 3200ms: SELECT * FROM users WHERE id = 999',
        stackTrace: 'Error: Query timed out\n    at executeQuery (/app/src/db.js:100:12)'
      };

      assert.strictEqual(generateFingerprint(error1), generateFingerprint(error2));
    });

    test('produces distinct fingerprints for different error types or locations', () => {
      const typeError = {
        type: 'TypeError',
        message: 'Cannot read property of undefined',
        stackTrace: '    at fnA (/app/src/a.js:10:5)'
      };

      const syntaxError = {
        type: 'SyntaxError',
        message: 'Unexpected token',
        stackTrace: '    at fnB (/app/src/b.js:20:5)'
      };

      assert.notStrictEqual(generateFingerprint(typeError), generateFingerprint(syntaxError));
    });
  });
});
