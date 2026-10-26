# traceback-node

> Lightweight, developer-first error monitoring and exception tracking SDK for Node.js and Express.

Seamlessly capture, group, and investigate application exceptions in real time with [TraceBack](https://github.com/yourusername/TraceBack).

---

## Features

- ⚡ **Zero-Overhead & Non-Blocking**: Error delivery runs asynchronously in the background. It will **never** block or crash your host application.
- 🔒 **In-Flight PII Redaction**: Automatically scrubs passwords, authorization tokens, API keys, and sensitive fields before telemetry leaves your machine.
- 🎯 **Deterministic Fingerprinting**: Groups identical recurring errors into single actionable issues using SHA-256 stack frame analysis.
- 🧩 **Express Ready**: Built-in `requestHandler` and `errorHandler` middlewares.

---

## Installation

```bash
npm install traceback-node
```

---

## Quickstart (Express)

```javascript
import express from 'express';
import { TraceBack } from 'traceback-node';

// 1. Initialize TraceBack at the top of your application
TraceBack.init({
  endpoint: process.env.TRACEBACK_ENDPOINT || 'http://localhost:3000/api/v1/events',
  projectKey: process.env.TRACEBACK_PROJECT_KEY,
  environment: process.env.NODE_ENV || 'production',
  release: 'v1.0.0',
  service: 'api-service'
});

const app = express();
app.use(express.json());

// 2. MUST BE REGISTERED BEFORE YOUR ROUTES
// Enriches request context (method, URL, headers) with automatic credential redaction
app.use(TraceBack.requestHandler());

// Your application routes
app.get('/api/orders', (req, res) => {
  res.json({ success: true });
});

// 3. MUST BE REGISTERED AFTER ALL ROUTES
// Intercepts unhandled errors, parses stack traces, and reports to TraceBack
app.use(TraceBack.errorHandler());

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Manual Exception Capture

For background tasks, cron jobs, or handled `try/catch` blocks:

```javascript
try {
  await processPayment(card);
} catch (error) {
  TraceBack.captureException(error, {
    userId: 'usr_123',
    orderId: 'ord_98765'
  });
}
```

## Capture Informational & Warning Messages

```javascript
TraceBack.captureMessage('High memory consumption detected in worker 2', 'warning', {
  memoryUsageMB: 1024
});
```

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `endpoint` | `string` | `'http://localhost:3000/api/v1/events'` | TraceBack ingestion API URL. |
| `projectKey` | `string` | `null` | Your project API key (`tb_live_...`). |
| `environment`| `string` | `'development'` | Deployment tier (`'production'`, `'staging'`). |
| `service` | `string` | `'api-service'` | Name of your service or microservice. |
| `release` | `string` | `'v1.0.0'` | Version release tag. |
| `enabled` | `boolean`| `true` | Enable or disable event capture. |
| `customDenylist` | `string[]` | `[]` | Additional sensitive field names to scrub. |

---

## License

MIT
