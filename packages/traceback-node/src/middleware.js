/**
 * Express Middleware Helpers
 */

/**
 * Creates a request-context middleware
 */
export function createRequestHandler(sdk) {
  return (req, res, next) => {
    try {
      req.__tracebackContext = {
        route: req.route?.path || req.path || req.url,
        method: req.method,
        query: req.query || {},
        headers: req.headers || {},
        ip: req.ip || req.connection?.remoteAddress,
        requestId: req.headers['x-request-id'] || null
      };
    } catch {
      // Swallowed to guarantee safety
    }
    next();
  };
}

/**
 * Creates an Express error-handling middleware
 */
export function createErrorHandler(sdk) {
  return (err, req, res, next) => {
    try {
      const context = req.__tracebackContext || {
        route: req.route?.path || req.path || req.url,
        method: req.method,
        query: req.query || {},
        headers: req.headers || {},
        ip: req.ip || req.connection?.remoteAddress,
        requestId: req.headers['x-request-id'] || null
      };

      sdk.captureException(err, context);
    } catch (sdkError) {
      // SDK failure must never intercept or break normal Express error dispatch
      console.error('[TraceBack SDK] Error capturing exception in middleware:', sdkError.message);
    }

    next(err);
  };
}
