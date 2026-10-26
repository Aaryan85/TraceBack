# TraceBack — System Architecture & Component Design

## 1. Overview & Architectural Goals

TraceBack is a lightweight, developer-first application error monitoring and triage system designed specifically for Node.js backends and microservices. The architecture is engineered around four core tenets:

1. **Non-Blocking Observability (Monitored App Protection):** Under no circumstance should the failure of the error monitoring service disrupt or crash the host application.
2. **Deterministic Grouping:** Duplicate errors must collapse into a single issue record regardless of dynamic values (UUIDs, timestamps, memory addresses, or record counts).
3. **Data Privacy by Default:** High-entropy credentials, access tokens, cookies, and sensitive payload attributes must be scrubbed before leaving the host and verified on the server.
4. **Developer Simplicity:** Zero external vendor dependencies, transparent Mongoose schemas, and clean, monochrome user interfaces.

---

## 2. Component Breakdown

The TraceBack platform consists of four primary software packages structured within an npm workspace:

```
traceback-workspace/
├── packages/traceback-node/  # Client instrumentation library
├── server/                   # Ingestion engine & REST API
├── client/                   # React 18 + Vite dashboard SPA
└── demo-app/                 # Monitored reference implementation
```

### A. TraceBack Node.js SDK (`@traceback/node`)
- **Location:** `packages/traceback-node`
- **Role:** Embedded into the monitored application to capture unhandled exceptions and warning messages.
- **Key Sub-modules:**
  - `TraceBackSDK` (`src/index.js`): Singleton facade managing initialization, configuration, and public capture methods.
  - `StackParser` (`src/stack.js`): Parses raw `Error.stack` strings into structured frames while removing Node.js internal runtime frames (`node:internal/*`).
  - `SensitiveDataRedactor` (`src/redactor.js`): Deep-traverses context objects and masks sensitive keys (passwords, tokens, secret keys) with `[REDACTED]`.
  - `Transport` (`src/transport.js`): Dispatches HTTP POST requests asynchronously using native `fetch` with a memory buffer to prevent event loss during sudden restarts.
  - `Middleware` (`src/middleware.js`): Provides `requestHandler()` for per-request telemetry (route, method, query) and `errorHandler()` for standard Express error interception.

### B. Ingestion Engine & REST API (`server`)
- **Location:** `server`
- **Role:** Validates inbound telemetry, guarantees rate limits, computes deterministic fingerprints, manages MongoDB persistence, and exposes queries for the dashboard.
- **Key Modules:**
  - `ingestionRateLimiter` (`src/middleware/rateLimiter.js`): In-memory sliding window limiter restricting requests to 150 requests/minute per project key or IP.
  - `authenticateProjectKey` (`src/middleware/auth.js`): Verifies `X-Project-Key` header or `Authorization: Bearer <key>` against the configured project key.
  - `validateAndSanitizeEvent` (`src/services/sanitizerService.js`): Validates schema constraints (message <= 2000 chars, stack trace <= 30000 chars) and performs deep recursive redaction.
  - `generateFingerprint` (`src/services/fingerprintService.js`): Normalizes error messages (replacing numbers with `{N}`, UUIDs with `{UUID}`, hex with `{HEX}`) and hashes with SHA-256 to create deterministic 64-character fingerprints.
  - `ingestEvent` (`src/controllers/ingestionController.js`): Atomically upserts `Issue` records and stores individual `ErrorEvent` documents with compensating rollback logic.
  - `issuesController` (`src/controllers/issuesController.js`): Provides endpoints for issue listing, searching, pagination, status transitions, and 24-hour error frequency aggregation.

### C. Developer Dashboard (`client`)
- **Location:** `client`
- **Role:** Single-page React application for error triage, stack inspection, and system monitoring.
- **Key Views:**
  - **Public Homepage (`src/pages/LandingPage.jsx`):** Minimalist SaaS landing page detailing features, workflow, architecture, and SDK quickstart.
  - **Overview (`src/pages/Overview.jsx`):** Real-time error frequency chart, 24-hour incident counters, and recent issues.
  - **Issue Tracker (`src/pages/Issues.jsx`):** Filterable, searchable table supporting status updates (`unresolved`, `resolved`, `ignored`).
  - **Issue Detail (`src/pages/IssueDetail.jsx`):** Stack trace frame explorer, latest occurrence context inspector, and event pagination.
  - **Project Setup (`src/pages/ProjectSetup.jsx`):** Interactive SDK configuration guide with live connection health checking.

### D. Monitored Reference Application (`demo-app`)
- **Location:** `demo-app`
- **Role:** Express server running on `:4000` instrumented with `@traceback/node` to demonstrate real-world crashes, validation errors, and timeout events.

---

## 3. Data Flow Architecture

```
[Monitored Application]
       │
       ▼ (Unhandled Error)
[SDK errorHandler] ──► [Redactor] ──► [Transport (POST /api/v1/events)]
                                                    │
                                                    ▼
                                      [Rate Limiter (150/min)]
                                                    │
                                                    ▼
                                      [Project Key Auth Check]
                                                    │
                                                    ▼
                                      [Server-Side Sanitizer]
                                                    │
                                                    ▼
                                      [SHA-256 Fingerprinter]
                                                    │
                                       ┌────────────┴────────────┐
                                       ▼                         ▼
                              [Upsert Issue]             [Save ErrorEvent]
                              (Atomic $inc)              (Compensating Rollback)
                                       │                         │
                                       └────────────┬────────────┘
                                                    ▼
                                            [MongoDB Database]
                                                    │
                                                    ▼
                                     [GET /api/issues & analytics]
                                                    │
                                                    ▼
                                       [React Developer Dashboard]
```

---

## 4. Resilience & Failure Handling Modes

| Failure Scenario | Mitigation Strategy | Result |
| :--- | :--- | :--- |
| **TraceBack Backend Offline** | SDK transport catches network errors internally in `Transport.send()` with `try/catch`. | Monitored application processes user requests without interruption. Error is logged to host stderr. |
| **Sudden Error Spike / DoS** | `ingestionRateLimiter` enforces sliding-window rate limit (150 req/min). | Returns `429 Too Many Requests` with `Retry-After` header. Database is protected from connection starvation. |
| **Malformed Ingestion Payload** | `sanitizerService` validates payload boundaries (type, message, stack limits). | Returns `400 Bad Request` with descriptive JSON validation error. |
| **Invalid Project Credentials** | `authenticateProjectKey` validates `X-Project-Key` before controller logic. | Returns `401 Unauthorized`. |
| **Partial Database Write** | If `ErrorEvent.create()` fails after `Issue` upsert, compensating logic decrements `issue.count`. | Data integrity maintained; issue occurrence count remains strictly accurate. |
| **MongoDB Disconnect** | Server uses non-blocking connection initialization with automatic reconnect listeners. | Ingestion returns `500 IngestionError`; server remains running and recovers upon DB reconnection. |
