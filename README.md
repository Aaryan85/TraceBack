# TraceBack

> **A developer-focused application error-monitoring and observability platform for Node.js.**  
> Capture, group, and investigate application errors in one simple workspace.

---

## 1. Project Overview & Motivation

Modern engineering teams often face a dilemma when setting up error tracking: full-blown enterprise platforms (such as Sentry or Datadog) bring heavy dependencies, vendor lock-in, and complex telemetry pipelines, while naive logging frameworks leave production exceptions buried in megabytes of raw text streams.

**TraceBack** is an open-source, full-stack error monitoring system engineered to solve this problem. It captures structured error events via a lightweight custom Node.js SDK, groups recurring incidents using deterministic SHA-256 fingerprinting, stores issues and occurrences in MongoDB, and presents actionable telemetry through a clean, monochrome developer dashboard.

This project was built from scratch as a serious software engineering portfolio project demonstrating distributed system fundamentals, in-flight PII redaction, deterministic error hashing, and full-stack API design.

---

## 2. Core Features

### Implemented Functionality (Stage 1 – Stage 6)
- **User Authentication & Session Management:** Complete secure signup, login, logout, and `/api/auth/me` session restoration using Node.js native `crypto.scrypt` password hashing and HTTP-only cookie sessions.
- **Multi-Project Workspace:** Full project management lifecycle (`/api/projects`) allowing authenticated developers to create, list, switch, update, and delete projects with cross-user isolation.
- **Dynamic Ingestion Key Management:** Cryptographically secure project-specific keys (`tb_live_<hex>`) with instant key rotation and revocation.
- **Custom Node.js SDK (`traceback-node`):** Lightweight, non-blocking error instrumentation featuring automated Express request-context and error-handling middlewares. Published on npm as `traceback-node`.
- **Fail-Safe Client Architecture:** SDK calls never crash or block the monitored host application, even during total network failure or backend downtime.
- **In-Flight Sensitive Data Redaction:** Recursive sanitization scrubs passwords, bearer tokens, API keys, and credit cards before telemetry leaves the host machine.
- **Deterministic Error Fingerprinting:** SHA-256 grouping algorithm normalizes dynamic variables (UUIDs, timestamps, database IDs, memory addresses) and prioritizes application stack frames over runtime internals.
- **Two-Tier Storage with Compensating Rollback:** Mongoose models isolate high-level `Issue` aggregates from granular `ErrorEvent` audit logs, with automatic counter rollback on partial writes.
- **Sliding-Window Rate Limiting:** Ingestion API protects against denial of service and cascading crash loops (150 requests/minute per project key).
- **Issue Triage & Resolution Workflow:** Change issue states across `unresolved`, `resolved`, and `ignored` with live update persistence.
- **24-Hour Error Frequency Analytics:** Hourly distribution histograms visualize error spikes, regression outbreaks, and deployment stability.
- **Public Marketing Homepage:** Minimalist SaaS landing page detailing platform architecture, features, and quickstart guides.

### Planned Roadmap
- Team collaboration and multi-user project sharing.
- Automated data retention policies via MongoDB TTL indexes for error events.
- AI-assisted root cause analysis and suggested git diff fixes.

---

## 3. Architecture Overview

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

*For comprehensive architecture specifications and operational flowcharts, see [`docs/diagrams.md`](docs/diagrams.md) and [`docs/architecture.md`](docs/architecture.md).*

---

## 4. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js (v18+), Express, CORS, Dotenv
- **Database:** MongoDB, Mongoose ODM
- **SDK Library:** Vanilla Node.js (`traceback-node` on npm)
- **Testing:** Native Node.js Test Runner (`node:test`, `node:assert/strict`)

---

## 5. Repository Structure

```
traceback/
├── client/                     # React 18 + Vite frontend SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components & layouts
│   │   ├── pages/              # LandingPage, Overview, Issues, IssueDetail, ProjectSetup
│   │   ├── services/           # API client service
│   │   ├── utils/              # Formatting helpers
│   │   ├── App.jsx             # Main dashboard & landing page router
│   │   ├── main.jsx            # Entry point with ErrorBoundary
│   │   └── index.css           # Tailwind design tokens & typography
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Ingestion Engine & REST API
│   ├── src/
│   │   ├── config/             # Environment configuration
│   │   ├── controllers/        # Ingestion & Issues controllers
│   │   ├── db/                 # MongoDB connection manager
│   │   ├── middleware/         # Auth & rate limiter middlewares
│   │   ├── models/             # Mongoose schemas (Issue, ErrorEvent)
│   │   ├── services/           # Fingerprint & Sanitizer services
│   │   └── server.js           # Express app bootstrap
│   ├── test/                   # Automated tests (api, fingerprint, security, models)
│   ├── .env.example
│   └── package.json
│
├── packages/traceback-node/     # Custom Node.js SDK
│   ├── src/
│   │   ├── index.js            # SDK singleton facade
│   │   ├── middleware.js       # Express request & error middlewares
│   │   ├── redactor.js         # In-flight sensitive data scrubber
│   │   ├── stack.js            # Stack trace parser & frame extractor
│   │   └── transport.js        # Non-blocking HTTP transport
│   ├── test/                   # SDK unit tests
│   └── package.json
│
├── demo-app/                   # Reference monitored Express application
│   ├── src/
│   │   └── app.js              # Express app with controlled crash routes
│   ├── test/                   # Demo app integration tests
│   ├── .env.example
│   └── package.json
│
├── docs/                       # Technical documentation
│   ├── architecture.md         # System design & resilience strategies
│   ├── setup.md                # Local setup & MongoDB Atlas guide
│   ├── api.md                  # REST API reference & schemas
│   ├── sdk.md                  # SDK integration & configuration guide
│   ├── database.md             # Mongoose models & index design
│   ├── security.md             # Threat model & PII sanitization
│   └── diagrams.md             # Official Mermaid architecture diagrams
│
├── package.json                # Monorepo npm workspaces configuration
└── README.md                   # This document
```

---

## 6. Prerequisites

Ensure your system has:
- **Node.js:** `>= 18.0.0`
- **npm:** `>= 9.0.0`
- **MongoDB:** Local MongoDB daemon (`mongodb://localhost:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection string.

---

## 7. Local Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url> traceback
cd traceback

# Install all workspace dependencies in a single step
npm install
```

### 2. Configure Environment Files

Create `.env` files for both the backend server and the demo application:

```bash
# Setup backend configuration
cp server/.env.example server/.env

# Setup demo application configuration
cp demo-app/.env.example demo-app/.env
```

#### Server Environment Variables (`server/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Ingestion engine and REST API port. |
| `MONGODB_URI` | `mongodb://localhost:27017/traceback` | MongoDB connection URI (local or Atlas). |
| `PROJECT_KEY` | `tb_live_demo_key_9823748293` | Secret key required to ingest events. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for the React dashboard. |
| `NODE_ENV` | `development` | Environment mode (`development`, `test`, `production`). |

#### Demo Application Environment Variables (`demo-app/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Monitored demo service port. |
| `TRACEBACK_ENDPOINT` | `http://localhost:3000/api/v1/events` | Target TraceBack ingestion URL. |
| `TRACEBACK_PROJECT_KEY` | `tb_live_demo_key_9823748293` | Ingestion authentication key. |
| `TRACEBACK_ENVIRONMENT` | `production` | Deployment tier attached to events. |
| `TRACEBACK_RELEASE` | `v1.2.4` | Version tag attached to events. |

---

## 8. Running the Application Stack

You can launch each workspace service independently:

```bash
# 1. Start the backend API server (runs on http://localhost:3000)
npm run dev:server

# 2. Start the React dashboard client (runs on http://localhost:5173)
npm run dev:client

# 3. Start the monitored demo application (runs on http://localhost:4000)
npm run dev:demo
```

Access the interfaces:
- **Public Marketing Site:** [`http://localhost:5173`](http://localhost:5173)
- **Live Dashboard:** [`http://localhost:5173/#overview`](http://localhost:5173/#overview)
- **Backend Health Check:** [`http://localhost:3000/api/health`](http://localhost:3000/api/health)
- **Monitored Demo App:** [`http://localhost:4000`](http://localhost:4000)

---

## 9. Triggering Sample Errors

Verify end-to-end event capture, PII redaction, and deterministic grouping by calling the instrumented routes in `demo-app`:

```bash
# 1. Real unhandled TypeError (Null pointer dereference)
curl http://localhost:4000/error/type-error

# 2. Validation error with sensitive password (Verifies client-side redaction)
curl -X POST http://localhost:4000/error/validation-error

# 3. Simulated database timeout (Verifies normalization of dynamic query values)
curl http://localhost:4000/error/db-sim

# 4. Custom warning message
curl http://localhost:4000/error/custom-message
```

---

## 10. Automated Testing

TraceBack uses the native Node.js test runner (`node:test`) for instant, dependency-free test execution:

```bash
# Run all workspace test suites
npm run test:all

# Or run individual package test suites:
npm run test:server   # Tests controllers, models, sanitization & fingerprinting
npm run test:sdk      # Tests SDK redactor, stack parser, and fail-safe facade
npm run test:demo     # Tests demo application error dispatching
```

---

## 11. API Summary

| Category | Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/signup` | None | Register new user, create initial project & session. |
| **Auth** | `POST` | `/api/auth/login` | None | Authenticate user credentials and issue session cookie. |
| **Auth** | `POST` | `/api/auth/logout` | Session Cookie | Invalidate session in DB and clear cookie. |
| **Auth** | `GET` | `/api/auth/me` | Session Cookie | Return authenticated user identity on refresh. |
| **Projects** | `GET` | `/api/projects` | Session Cookie | List all projects owned by caller. |
| **Projects** | `POST` | `/api/projects` | Session Cookie | Create project with auto-generated ingestion key. |
| **Projects** | `GET` | `/api/projects/:id` | Session Cookie | Retrieve project details (enforces ownership). |
| **Projects** | `PATCH` | `/api/projects/:id` | Session Cookie | Update project name, description, or status. |
| **Projects** | `DELETE` | `/api/projects/:id` | Session Cookie | Delete project and associated telemetry. |
| **Projects** | `POST` | `/api/projects/:id/rotate-key` | Session Cookie | Rotate project ingestion API key immediately. |
| **Ingestion** | `POST` | `/api/v1/events` | `X-Project-Key` | Ingests, sanitizes, fingerprints, and groups errors. |
| **Dashboard** | `GET` | `/api/issues` | Project Scoped | Paginated issues filtered by project and status. |
| **Dashboard** | `GET` | `/api/issues/:id` | Project Scoped | Issue details with stack trace (enforces ownership). |
| **Dashboard** | `GET` | `/api/issues/:id/events` | Project Scoped | Paginated occurrence history for a specific issue. |
| **Dashboard** | `PATCH` | `/api/issues/:id/status` | Project Scoped | Update issue status (`unresolved`, `resolved`, `ignored`). |
| **Analytics** | `GET` | `/api/analytics/error-frequency`| Project Scoped | 24-hour error distribution histogram and counters. |
| **System** | `GET` | `/api/health` | None | Service status, uptime, and database connection state. |

*For complete request/response schemas, validation rules, and error codes, refer to [`docs/api.md`](docs/api.md).*

---

## 12. SDK Quickstart Example

```javascript
import express from 'express';
import { TraceBack } from 'traceback-node';

// 1. Initialize TraceBack
TraceBack.init({
  endpoint: 'http://localhost:3000/api/v1/events',
  projectKey: process.env.TRACEBACK_PROJECT_KEY,
  environment: 'production',
  release: 'v1.0.0'
});

const app = express();

// 2. Request context enrichment middleware (Register first)
app.use(TraceBack.requestHandler());

// Your application routes
app.get('/api/checkout', (req, res) => {
  throw new Error('Payment gateway unreachable');
});

// 3. Error handling middleware (Register last)
app.use(TraceBack.errorHandler());

app.listen(3000);
```

---

## 13. UI Preview & Screenshots

| View | Description | Preview |
| :--- | :--- | :--- |
| **Public Homepage** | Minimalist SaaS landing page with features and SDK quickstart. | `[Screenshot: Landing Page]` |
| **System Overview** | 24-hour error frequency histogram and recent issue telemetry. | `[Screenshot: Dashboard Overview]` |
| **Issue Tracker** | Filterable table with environment badges, counts, and triage actions. | `[Screenshot: Issue Tracker]` |
| **Stack Trace Inspector** | Filtered stack trace isolating user code and sanitized context. | `[Screenshot: Stack Trace View]` |

---

## 14. Known Limitations & Security Considerations

- **Single-Tenant Verification:** The current stage authenticates events against a shared server-level `PROJECT_KEY`. Multi-tenant project management is scheduled for Stage 6.
- **In-Memory Rate Limiting:** The sliding-window rate limiter stores hit counters in process memory. In a multi-instance horizontal deployment, this should be backed by Redis.
- **MongoDB Atlas Configuration:** While full MongoDB Atlas URI support is implemented in `server/src/db/connection.js`, live database behavior depends on valid cluster network access and credentials provided in `server/.env`.
- **In-Flight Data Redaction:** While common tokens and credentials are automatically scrubbed, applications logging highly bespoke sensitive fields should declare them via `customDenylist` in `TraceBack.init()`.

---

## 15. License

This project is licensed under the [MIT License](LICENSE).
