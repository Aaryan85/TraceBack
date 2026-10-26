# TraceBack — Security, Privacy & Credential Handling

This document specifies the threat model, privacy safeguards, and security controls built into the TraceBack architecture.

---

## 1. Threat Model & Security Boundaries

TraceBack operates in two security contexts:
1. **The Ingestion Pipeline:** Public-facing or VPC-internal endpoint receiving untrusted runtime exception payloads from monitored services.
2. **The Dashboard & REST API:** Management interface for software engineers investigating system failures.

### Primary Risks & Mitigations
- **PII / Credential Leakage:** Developers accidentally logging passwords, API keys, or credit cards in error contexts.
  - *Mitigation:* Multi-tier in-flight and server-side redactor.
- **Ingestion Flood / Denial of Service (DoS):** Misconfigured retry loops or malicious bursts overwhelming database connections.
  - *Mitigation:* Sliding window rate limiter (150 req/min) returning HTTP 429.
- **Payload Bombs (ReDoS / Memory Exhaustion):** Giant stack traces or deeply nested JSON crashing the ingestion worker.
  - *Mitigation:* Strict character length limits, 100kb body parser limit, and `WeakSet` circular reference traps.
- **Cross-Origin Telemetry Hijacking:** Malicious web pages probing the local API.
  - *Mitigation:* CORS policy restricted to configured `CLIENT_ORIGIN`.

---

## 2. In-Flight & Server-Side Data Redaction (Defense in Depth)

TraceBack implements a **two-tier redaction pipeline**:

```
[Host Application]
       │
       ▼ (Unsanitized Context)
[SDK Redactor (Client)] ───► Masks passwords, tokens, auth headers
       │
       ▼ (Over HTTP)
[Server Sanitizer]      ───► Re-verifies boundaries & scrubs any missed PII
       │
       ▼
[Persistent Storage (MongoDB)]
```

### Redaction Rules
Both the client SDK (`packages/traceback-node/src/redactor.js`) and server sanitizer (`server/src/services/sanitizerService.js`) inspect all object keys recursively:

1. **Blacklisted Key Substrings:**
   Any key containing any of the following substrings is masked with `[REDACTED]`:
   - `password`, `passwd`
   - `secret`, `token`
   - `authorization`, `auth`
   - `cookie`
   - `apikey`, `api_key`, `access_token`, `refresh_token`
   - `private_key`
   - `credit_card`, `creditcard`, `cardnumber`, `cvv`
   - `ssn`

2. **Bearer Token Regular Expression:**
   String fields matching `/bearer\s+[a-zA-Z0-9_\-\.]+/i` are replaced with `Bearer [REDACTED]` to prevent header leaks.

3. **Circular Reference Protection:**
   Uses a `WeakSet` of visited objects. If a cyclic reference is encountered, it is safely replaced with `"[Circular]"` without unbounded recursion.

---

## 3. Ingestion Authentication

Ingestion endpoints require verification via the `authenticateProjectKey` middleware:

```javascript
export function authenticateProjectKey(req, res, next) {
  let providedKey = req.headers['x-project-key'];

  if (!providedKey && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    }
  }

  if (!providedKey || providedKey !== config.projectKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid project key provided.'
    });
  }

  req.projectKey = providedKey;
  next();
}
```

---

## 4. Input Sanitization & Payload Boundaries

To prevent memory bloat and injection vectors:
- **Express JSON Body Limit:** Capped at `100kb` (`express.json({ limit: '100kb' })`).
- **Error Message Limit:** Truncated and validated to maximum `2000` characters.
- **Stack Trace Limit:** Validated to maximum `30000` characters.
- **Route Identifier Limit:** Validated to maximum `500` characters.
- **Deterministic Number Normalization:** Numbers, UUIDs, and hex memory pointers are replaced with token masks prior to fingerprint generation to neutralize hash collision manipulation.

---

## 5. Deployment Security Recommendations

For production environments (e.g. AWS, Render, DigitalOcean):
1. **Never commit `.env` files:** Store `PROJECT_KEY` and `MONGODB_URI` in your cloud provider's encrypted environment vault.
2. **Use HTTPS / TLS:** Ensure all communication between the monitored application and the TraceBack server uses TLS (`https://...`).
3. **Restrict MongoDB Access:** When using MongoDB Atlas, restrict IP access lists to your backend server's static IP or VPC peering.
4. **CORS Locking:** Set `CLIENT_ORIGIN` in `server/.env` to the exact public domain of your deployed dashboard.
