# TraceBack — Node.js SDK Reference (`@traceback/node`)

The `@traceback/node` package provides lightweight, fail-safe error instrumentation for Node.js backends and Express services.

---

## 1. Installation

In the TraceBack monorepo workspace, `@traceback/node` is linked automatically. For external Node.js projects, install the package:

```bash
npm install @traceback/node
```

*Note: For local workspace experimentation, reference the package via `"@traceback/node": "*"` in `package.json`.*

---

## 2. Initialization

Import and initialize the singleton `TraceBack` instance at application startup, before defining Express routes:

```javascript
import { TraceBack } from '@traceback/node';

TraceBack.init({
  endpoint: process.env.TRACEBACK_ENDPOINT || 'http://localhost:3000/api/v1/events',
  projectKey: process.env.TRACEBACK_PROJECT_KEY,
  environment: process.env.NODE_ENV || 'production',
  release: 'v1.0.0',
  service: 'api-service',
  enabled: true,
  customDenylist: ['internalApiKey', 'taxId']
});
```

### Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `endpoint` | String | `http://localhost:3000/api/v1/events` | Ingestion API URL. |
| `projectKey` | String | `null` | Authentication key matching `server`'s `PROJECT_KEY`. |
| `environment` | String | `'development'` | Environment tier tag (`'development'`, `'staging'`, `'production'`). |
| `release` | String | `'v1.0.0'` | Semantic version or Git commit SHA. |
| `service` | String | `'api-service'` | Identifier for the reporting service. |
| `enabled` | Boolean | `true` | Set to `false` to disable telemetry (e.g. during local tests). |
| `customDenylist` | Array | `[]` | Additional keys to automatically redact from context. |

---

## 3. Express Framework Integration

TraceBack provides two middlewares for complete, automated Express instrumentation:

```javascript
import express from 'express';
import { TraceBack } from '@traceback/node';

const app = express();

// 1. Request handler (must be the FIRST middleware)
// Attaches request route, method, headers, and correlation ID to error context
app.use(TraceBack.requestHandler());

// Standard middleware & routes
app.use(express.json());

app.get('/api/users/:id', async (req, res) => {
  const user = await findUser(req.params.id);
  res.json(user);
});

// 2. Error handler (must be registered AFTER all routes)
// Intercepts unhandled errors passed to next(err) and forwards them to TraceBack
app.use(TraceBack.errorHandler());

app.listen(3000);
```

---

## 4. Manual Error & Message Capture

### `captureException(error, [context])`
Captures caught or custom errors with optional contextual metadata.

```javascript
try {
  executePayment(orderId);
} catch (err) {
  TraceBack.captureException(err, {
    orderId: 'ord_9941',
    attempt: 3,
    billingPostal: '94103'
  });
  
  // Optionally rethrow or return user-facing error
  res.status(500).json({ error: 'Payment failed' });
}
```

### `captureMessage(message, [level], [context])`
Dispatches an informational or diagnostic message.

```javascript
// level defaults to 'info'; supports 'warning', 'error', 'debug'
TraceBack.captureMessage('Redis connection pool exhausted, retrying in 2s', 'warning', {
  poolSize: 50,
  activeConnections: 50
});
```

---

## 5. Privacy & Sensitive Data Redaction

TraceBack scrubs confidential data **in-flight on the client machine** before transmission.

### Automatically Redacted Key Patterns
Any key matching the following substrings (case-insensitive) is replaced with `[REDACTED]`:
- `password`, `passwd`
- `secret`, `token`
- `authorization` (Bearer tokens are sanitized to `Bearer [REDACTED]`)
- `cookie`
- `apikey`, `api_key`, `access_token`, `refresh_token`
- `private_key`
- `credit_card`, `creditcard`, `cardnumber`, `cvv`
- `ssn`

### Circular Reference Safety
The redactor uses a `WeakSet` tracker to detect circular references in arbitrary JavaScript objects, gracefully transforming them to `[Circular]` without causing stack overflows.

---

## 6. Fail-Safe Architectural Guarantees

The SDK is engineered to never crash the host application:
1. All public API calls are wrapped in non-throwing `try/catch` boundaries.
2. In the event of a network outage, database crash, or HTTP timeout on the TraceBack server, the SDK logs a diagnostic warning to `stderr` and yields execution.
3. If an invalid or uninitialized error is passed (e.g. `captureException(null)` or `captureException(undefined)`), the parser converts it to a safe `UnhandledRejection` event rather than throwing.
