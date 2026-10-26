import { parseError } from './stack.js';
import { redactSensitiveData } from './redactor.js';
import { Transport } from './transport.js';
import { createRequestHandler, createErrorHandler } from './middleware.js';
import os from 'os';

/**
 * TraceBack SDK Facade
 */
class TraceBackSDK {
  constructor() {
    this.config = {
      endpoint: 'http://localhost:3000/api/v1/events',
      projectKey: null,
      environment: 'development',
      release: 'v1.0.0',
      service: 'api-service',
      enabled: true,
      customDenylist: []
    };
    this.transport = null;
    this.initialized = false;
  }

  /**
   * Initialize TraceBack with configuration
   * @param {Object} options
   */
  init(options = {}) {
    this.config = {
      ...this.config,
      ...options
    };

    if (!this.config.projectKey) {
      console.warn('[TraceBack SDK] Warning: projectKey was not provided. Events will be sent unauthenticated.');
    }

    this.transport = new Transport({
      endpoint: this.config.endpoint,
      projectKey: this.config.projectKey
    });

    this.initialized = true;
    return this;
  }

  /**
   * Construct a standard event payload
   */
  _buildEventPayload({ type, message, stackTrace = null, context = {} }) {
    // Redact sensitive credentials in request/runtime context
    const sanitizedContext = redactSensitiveData(context, this.config.customDenylist) || {};

    // Enrich with runtime telemetry
    sanitizedContext.runtime = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      pid: process.pid
    };

    const route = context.route || (context.method && context.url ? `${context.method} ${context.url}` : null);

    return {
      projectKey: this.config.projectKey,
      type,
      message,
      stackTrace,
      route,
      service: this.config.service,
      environment: this.config.environment,
      release: this.config.release,
      requestId: context.requestId || null,
      timestamp: new Date().toISOString(),
      context: sanitizedContext
    };
  }

  /**
   * Capture an unhandled exception or caught error
   * @param {Error|any} error
   * @param {Object} context
   */
  captureException(error, context = {}) {
    if (!this.initialized || !this.config.enabled) return null;

    try {
      const parsed = parseError(error);
      const payload = this._buildEventPayload({
        type: parsed.type,
        message: parsed.message,
        stackTrace: parsed.stackTrace,
        context
      });

      this.transport.send(payload);
      return payload;
    } catch (err) {
      // Fail-safe guarantee: Never crash monitored application
      console.error('[TraceBack SDK] Internal failure during captureException:', err.message);
      return null;
    }
  }

  /**
   * Capture an informational or warning message
   * @param {string} message
   * @param {string} level
   * @param {Object} context
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.initialized || !this.config.enabled) return null;

    try {
      const payload = this._buildEventPayload({
        type: `Message:${level.toUpperCase()}`,
        message: String(message),
        stackTrace: new Error().stack || null,
        context: {
          ...context,
          level
        }
      });

      this.transport.send(payload);
      return payload;
    } catch (err) {
      console.error('[TraceBack SDK] Internal failure during captureMessage:', err.message);
      return null;
    }
  }

  /**
   * Express request-context middleware
   */
  requestHandler() {
    return createRequestHandler(this);
  }

  /**
   * Express error-handling middleware
   */
  errorHandler() {
    return createErrorHandler(this);
  }

  /**
   * Manually flush buffered events
   */
  async flush() {
    if (this.transport) {
      await this.transport.flush();
    }
  }
}

export const TraceBack = new TraceBackSDK();
export default TraceBack;
