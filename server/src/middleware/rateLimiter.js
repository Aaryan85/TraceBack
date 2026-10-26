/**
 * Rate Limiter Middleware for TraceBack Event Ingestion
 * Sliding window rate limiting to protect ingestion API from denial of service and error floods.
 */

class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 120) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Clean up stale IP records every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now - record.startTime > this.windowMs) {
          this.hits.delete(key);
        }
      }
    }, 300000).unref(); // unref so it does not keep process open during tests
  }

  middleware() {
    return (req, res, next) => {
      // Key on project key or client IP
      const key = req.headers['x-project-key'] || req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();

      let record = this.hits.get(key);

      if (!record || (now - record.startTime > this.windowMs)) {
        record = {
          count: 1,
          startTime: now
        };
        this.hits.set(key, record);
      } else {
        record.count++;
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((record.startTime + this.windowMs) / 1000));

      if (record.count > this.maxRequests) {
        const retryAfter = Math.ceil((record.startTime + this.windowMs - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          error: 'TooManyRequests',
          message: `Ingestion rate limit exceeded. Max ${this.maxRequests} requests per minute.`,
          retryAfterSeconds: retryAfter
        });
      }

      next();
    };
  }
}

export const ingestionRateLimiter = new RateLimiter(60000, 150);
export { RateLimiter };
