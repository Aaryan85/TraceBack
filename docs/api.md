# TraceBack — REST API Reference Documentation

The TraceBack backend provides three categories of REST endpoints:
1. **User Authentication APIs (`/api/auth/*`):** User registration, session login, logout, and identity verification.
2. **Project Management APIs (`/api/projects/*`):** Multi-project workspace management, access control, and API key rotation.
3. **Ingestion & Dashboard APIs (`/api/v1/events`, `/api/issues/*`, `/api/analytics/*`):** High-throughput event ingestion and project-scoped developer triage.

**Base URL:** `http://localhost:3000`

---

## 1. Authentication & Security Models

### A. Dashboard Session Authentication
- Authenticated requests use **HTTP-only session cookies** (`tb_session`) or `Authorization: Bearer <sessionId>`.
- Sessions are stored in MongoDB with native TTL auto-expiration (7 days).
- Set `credentials: 'include'` when querying from web clients.

### B. Ingestion API Key Authentication
- Monitored services authenticate error dispatches via:
  - Header: `X-Project-Key: tb_live_<hex>` **OR**
  - Header: `Authorization: Bearer tb_live_<hex>`
- Ingestion keys are project-specific. An invalid or revoked key returns HTTP `401 Unauthorized`.

### C. Rate Limiting
- **Window:** 60 seconds (sliding window)
- **Threshold:** 150 requests per minute per project key or client IP
- **Headers:** `X-RateLimit-Limit: 150`, `X-RateLimit-Remaining: <int>`, `X-RateLimit-Reset: <epoch>`
- HTTP `429 Too Many Requests` returned when exhausted.

---

## 2. User Authentication APIs

### Sign Up
Registers a new user, hashes the password using `scrypt`, sets a session cookie, and provisions a default project.

- **Method:** `POST`
- **Path:** `/api/auth/signup`
- **Body:**
```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "SecurePassword123!"
}
```
- **Responses:**
  - `201 Created`: Returns user object and starter project details; sets `tb_session` cookie.
  - `400 Bad Request`: Validation failure (short password, invalid email format).
  - `409 Conflict`: Duplicate email address.

---

### Sign In
Verifies user credentials using constant-time comparison, creates a persistent session, and returns an HTTP-only cookie.

- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Body:**
```json
{
  "email": "ada@example.com",
  "password": "SecurePassword123!"
}
```
- **Responses:**
  - `200 OK`: Returns authenticated user info; sets `tb_session` cookie.
  - `401 Unauthorized`: Invalid email or password.

---

### Sign Out
Invalidates the session in MongoDB and clears the HTTP-only cookie.

- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Responses:**
  - `200 OK`: `{ "status": "success", "message": "Logged out successfully." }`

---

### Get Active User (`/me`)
Restores session state on browser refresh.

- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Responses:**
  - `200 OK`: `{ "status": "success", "user": { "_id": "...", "name": "...", "email": "..." } }`
  - `401 Unauthorized`: No active session.

---

## 3. Project Management APIs

All project management endpoints require an authenticated user session.

### List Projects
Returns all projects owned by the authenticated user.

- **Method:** `GET`
- **Path:** `/api/projects`
- **Response (200 OK):**
```json
{
  "status": "success",
  "projects": [
    {
      "_id": "67bb401a...",
      "name": "Production API Gateway",
      "description": "Primary backend service",
      "apiKey": "tb_live_948f2b189a...",
      "status": "active",
      "createdAt": "2026-10-25T14:00:00.000Z"
    }
  ]
}
```

---

### Create Project
Creates a new project owned by the caller and generates a cryptographically secure ingestion key.

- **Method:** `POST`
- **Path:** `/api/projects`
- **Body:**
```json
{
  "name": "Billing Service",
  "description": "Stripe payment and invoice worker"
}
```
- **Response (201 Created):** Returns new project object with generated `apiKey`.

---

### Retrieve Project by ID
Retrieves details and basic telemetry counts for a project. Enforces ownership: users cannot query another user's project.

- **Method:** `GET`
- **Path:** `/api/projects/:id`
- **Responses:**
  - `200 OK`: Project details and occurrence counters.
  - `404 Not Found`: Project does not exist or caller is not the owner.

---

### Update Project
Updates project name, description, or status (`active` | `archived`).

- **Method:** `PATCH`
- **Path:** `/api/projects/:id`
- **Body:**
```json
{
  "name": "Renamed Service",
  "status": "active"
}
```
- **Response (200 OK):** Returns updated project document.

---

### Rotate Ingestion Key
Rotates the project's ingestion API key immediately. Previous keys stop accepting events.

- **Method:** `POST`
- **Path:** `/api/projects/:id/rotate-key`
- **Response (200 OK):** Returns project document with new `apiKey`.

---

### Delete Project
Permanently removes the project and deletes all associated issues and error events.

- **Method:** `DELETE`
- **Path:** `/api/projects/:id`
- **Response (200 OK):** Confirmation message.

---

## 4. Ingestion API

### Ingest Error Event
- **Method:** `POST`
- **Path:** `/api/v1/events`
- **Headers:** `X-Project-Key: tb_live_<key>`
- **Body:**
```json
{
  "type": "TypeError",
  "message": "Cannot read properties of null (reading 'role')",
  "stackTrace": "TypeError: Cannot read properties of null\n    at getUser (/app/src/user.js:42:15)",
  "route": "GET /api/users/profile",
  "service": "api-gateway",
  "environment": "production",
  "release": "v1.2.4",
  "requestId": "req_88192031",
  "context": {
    "userId": "usr_9912",
    "password": "my-secret-password-123"
  }
}
```
- **Responses:**
  - `201 Created`: `{ "status": "success", "data": { "issueId": "...", "eventId": "...", "fingerprint": "...", "count": 14 } }`
  - `400 Bad Request`: Payload validation failed.
  - `401 Unauthorized`: Invalid or missing project key.
  - `429 Too Many Requests`: Rate limit exceeded.

---

## 5. Dashboard APIs (Project-Scoped)

All dashboard endpoints strictly scope queries to the caller's project access via `?projectId=<id>` or `X-Project-Id` header.

### List Issues
- **Method:** `GET`
- **Path:** `/api/issues?projectId=<id>&status=unresolved&page=1&limit=25`
- Returns paginated issues scoped to the verified project.

### Get Issue by ID
- **Method:** `GET`
- **Path:** `/api/issues/:id`
- Enforces project ownership: returns `403 Forbidden` if caller does not own the project the issue belongs to.

### Update Issue Status
- **Method:** `PATCH`
- **Path:** `/api/issues/:id/status`
- **Body:** `{ "status": "resolved" }`

### Error Frequency Analytics
- **Method:** `GET`
- **Path:** `/api/analytics/error-frequency?projectId=<id>`
- Returns 24-hour hourly distribution histogram scoped to the selected project.
