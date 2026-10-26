/**
 * HTTP/HTTPS Network Transport
 * Fail-safe, non-blocking ingestion transport with queue bounding and timeouts.
 */

export class Transport {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'http://localhost:3000/api/v1/events';
    this.projectKey = options.projectKey || '';
    this.timeoutMs = options.timeoutMs || 4000;
    this.maxQueueSize = options.maxQueueSize || 50;
    this.queue = [];
    this.isFlushing = false;
    this.isSending = false; // Recursion protection guard
  }

  /**
   * Enqueue an event for outbound dispatch
   */
  send(event) {
    if (this.isSending) {
      // Prevent recursive reporting if the transport itself encounters an error
      return;
    }

    // Bounded queue: drop oldest events if buffer capacity is exceeded
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }

    this.queue.push(event);
    this.flush();
  }

  /**
   * Flush all queued events to the ingestion endpoint
   */
  async flush() {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    while (this.queue.length > 0) {
      const event = this.queue[0];

      try {
        this.isSending = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Project-Key': this.projectKey
          },
          body: JSON.stringify(event),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Log non-2xx status for debugging without throwing
          console.warn(`[TraceBack SDK] Ingestion returned status ${response.status}: ${response.statusText}`);
        }

        // Successfully processed from queue
        this.queue.shift();
      } catch (err) {
        // Fail-safe: Network drop, timeout, or DNS failure must never crash host app
        console.warn('[TraceBack SDK] Failed to deliver event to ingestion API:', err.message);
        // Remove failed item to avoid infinite retries blocking newer events
        this.queue.shift();
      } finally {
        this.isSending = false;
      }
    }

    this.isFlushing = false;
  }
}
