process.env.NODE_ENV = 'test';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Issue } from '../src/models/Issue.js';
import { ErrorEvent } from '../src/models/ErrorEvent.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { getDBStatus } from '../src/db/connection.js';

describe('Stage 2 — Data Models & Schema Validation', () => {
  describe('Issue Model Validation', () => {
    test('validates successfully with required fields and assigns defaults', () => {
      const validIssue = new Issue({
        projectKey: 'tb_live_demo_key_9823748293',
        fingerprint: 'sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        type: 'TypeError',
        message: 'Cannot read properties of undefined (reading \'id\')',
        sampleStackTrace: 'TypeError: Cannot read properties of undefined\n    at getUser (/app/routes.js:42:15)'
      });

      const validationError = validIssue.validateSync();
      assert.strictEqual(validationError, undefined, 'Valid issue should pass validation');
      assert.strictEqual(validIssue.count, 1);
      assert.strictEqual(validIssue.status, 'unresolved');
      assert.strictEqual(validIssue.environment, 'development');
      assert.strictEqual(validIssue.release, 'v1.0.0');
      assert.ok(validIssue.firstSeen instanceof Date);
      assert.ok(validIssue.lastSeen instanceof Date);
    });

    test('fails validation when required fields are missing', () => {
      const invalidIssue = new Issue({});
      const error = invalidIssue.validateSync();
      assert.ok(error, 'Should fail validation when fields are missing');
      assert.ok(error.errors.projectKey, 'projectKey is required');
      assert.ok(error.errors.fingerprint, 'fingerprint is required');
      assert.ok(error.errors.type, 'type is required');
      assert.ok(error.errors.message, 'message is required');
    });

    test('rejects invalid issue status', () => {
      const issueWithBadStatus = new Issue({
        projectKey: 'tb_demo_key',
        fingerprint: 'abc123hash',
        type: 'SyntaxError',
        message: 'Unexpected token',
        status: 'archived' // not in enum ['unresolved', 'resolved', 'ignored']
      });

      const error = issueWithBadStatus.validateSync();
      assert.ok(error, 'Should reject invalid status enum');
      assert.ok(error.errors.status);
    });

    test('rejects occurrence count less than 1', () => {
      const issueWithZeroCount = new Issue({
        projectKey: 'tb_demo_key',
        fingerprint: 'abc123hash',
        type: 'RangeError',
        message: 'Invalid array length',
        count: 0
      });

      const error = issueWithZeroCount.validateSync();
      assert.ok(error, 'Should reject count < 1');
      assert.ok(error.errors.count);
    });
  });

  describe('ErrorEvent Model Validation', () => {
    test('validates successfully with valid reference and context', () => {
      const mockIssueId = new mongoose.Types.ObjectId();
      const validEvent = new ErrorEvent({
        issueId: mockIssueId,
        fingerprint: 'sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        projectKey: 'tb_live_demo_key_9823748293',
        type: 'TypeError',
        message: 'Cannot read properties of undefined',
        route: 'GET /api/users/99',
        service: 'payment-service',
        environment: 'staging',
        release: 'v1.4.2',
        requestId: 'req-uuid-98427',
        context: {
          headers: { 'user-agent': 'Mozilla/5.0' },
          nodeVersion: 'v20.10.0'
        }
      });

      const error = validEvent.validateSync();
      assert.strictEqual(error, undefined, 'Valid event should pass validation');
      assert.strictEqual(validEvent.issueId.toString(), mockIssueId.toString());
      assert.strictEqual(validEvent.service, 'payment-service');
      assert.strictEqual(validEvent.context.nodeVersion, 'v20.10.0');
      assert.ok(validEvent.timestamp instanceof Date);
    });

    test('fails validation when required event fields are missing', () => {
      const invalidEvent = new ErrorEvent({});
      const error = invalidEvent.validateSync();
      assert.ok(error, 'Should fail validation without required fields');
      assert.ok(error.errors.issueId, 'issueId is required');
      assert.ok(error.errors.fingerprint, 'fingerprint is required');
      assert.ok(error.errors.projectKey, 'projectKey is required');
      assert.ok(error.errors.type, 'type is required');
      assert.ok(error.errors.message, 'message is required');
    });

    test('assigns defaults for service, environment, release, and context', () => {
      const eventWithDefaults = new ErrorEvent({
        issueId: new mongoose.Types.ObjectId(),
        fingerprint: 'fp_123',
        projectKey: 'tb_test_key',
        type: 'Error',
        message: 'Standard test failure'
      });

      const error = eventWithDefaults.validateSync();
      assert.strictEqual(error, undefined);
      assert.strictEqual(eventWithDefaults.service, 'api-server');
      assert.strictEqual(eventWithDefaults.environment, 'development');
      assert.strictEqual(eventWithDefaults.release, 'v1.0.0');
      assert.deepStrictEqual(eventWithDefaults.context, {});
    });
  });

  describe('User Model Validation', () => {
    test('validates valid user and strips passwordHash in toJSON', () => {
      const user = new User({
        name: 'Ada Lovelace',
        email: 'ada@computing.org',
        passwordHash: 'salt:hexhash'
      });
      const error = user.validateSync();
      assert.strictEqual(error, undefined);
      assert.strictEqual(user.email, 'ada@computing.org');
      const json = user.toJSON();
      assert.strictEqual(json.passwordHash, undefined, 'passwordHash must never be exposed');
    });

    test('fails validation when email is invalid or missing', () => {
      const user = new User({ name: 'User', email: 'not-an-email', passwordHash: 'hash' });
      const error = user.validateSync();
      assert.ok(error && error.errors.email);
    });
  });

  describe('Project Model Validation', () => {
    test('validates valid project with required fields and defaults', () => {
      const project = new Project({
        name: 'Core API',
        owner: new mongoose.Types.ObjectId(),
        apiKey: 'tb_live_1234567890abcdef'
      });
      const error = project.validateSync();
      assert.strictEqual(error, undefined);
      assert.strictEqual(project.status, 'active');
      assert.strictEqual(project.description, '');
    });

    test('fails validation when name or owner is missing', () => {
      const project = new Project({ apiKey: 'key' });
      const error = project.validateSync();
      assert.ok(error && error.errors.name && error.errors.owner);
    });
  });

  describe('Database Connection Status', () => {
    test('getDBStatus returns a valid connection state string', () => {
      const status = getDBStatus();
      assert.ok(['disconnected', 'connected', 'connecting', 'disconnecting'].includes(status));
    });
  });
});
