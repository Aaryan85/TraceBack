# TraceBack — Database Architecture & Schema Reference

TraceBack uses MongoDB with Mongoose for persistence, balancing fast atomic writes during error surges with high-throughput multi-tenant dashboard querying.

---

## 1. Schema Design Philosophy

Error monitoring systems exhibit write-heavy ingestion workloads. To prevent locking and high storage footprints:
- **`User` (Identity Collection):** Stores unique developer accounts with scrypt password hashes.
- **`Session` (Auth Collection):** Stores active server sessions with native MongoDB TTL auto-cleanup.
- **`Project` (Workspace Collection):** Scopes issues, events, and API ingestion credentials to specific user accounts.
- **`Issue` (Parent Telemetry Collection):** Stores grouped error metadata, aggregate occurrence counters (`count`), status (`unresolved`, `resolved`, `ignored`), and timestamps (`firstSeen`, `lastSeen`).
- **`ErrorEvent` (Child Telemetry Collection):** Stores immutable individual occurrences linked via `issueId` and `projectId`, complete with stack traces, HTTP routes, and runtime contexts.

This design allows the dashboard to render lists and analytics by scanning small `Issue` documents, only querying heavy `ErrorEvent` documents when a developer drills down into stack traces or historical occurrence timelines.

---

## 2. Active Mongoose Schemas

### A. `User` Collection (`server/src/models/User.js`)
```javascript
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);
```
- **Indexes:** `{ email: 1 }` (Unique).

---

### B. `Session` Collection (`server/src/models/Session.js`)
```javascript
const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
  },
  { timestamps: true }
);
```
- **TTL Index:** `{ expiresAt: 1 }` with `expireAfterSeconds: 0` automatically purges expired sessions from the database without cron jobs.

---

### C. `Project` Collection (`server/src/models/Project.js`)
```javascript
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true }
  },
  { timestamps: true }
);
```
- **Indexes:** `{ apiKey: 1 }` (Unique), `{ owner: 1, status: 1, createdAt: -1 }`.

---

### D. `Issue` Collection (`server/src/models/Issue.js`)
```javascript
const issueSchema = new mongoose.Schema(
  {
    projectKey: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    fingerprint: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    message: { type: String, required: true },
    sampleStackTrace: { type: String, default: null },
    count: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ['unresolved', 'resolved', 'ignored'], default: 'unresolved', index: true },
    firstSeen: { type: Date, default: Date.now, index: true },
    lastSeen: { type: Date, default: Date.now, index: true },
    release: { type: String, default: 'v1.0.0' },
    environment: { type: String, default: 'development', index: true }
  },
  { timestamps: true }
);
```
- **Indexes:** `{ projectKey: 1, fingerprint: 1 }` (Unique), `{ projectId: 1, status: 1, lastSeen: -1 }`.

---

### E. `ErrorEvent` Collection (`server/src/models/ErrorEvent.js`)
```javascript
const errorEventSchema = new mongoose.Schema(
  {
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    fingerprint: { type: String, required: true, index: true },
    projectKey: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    stackTrace: { type: String, default: null },
    route: { type: String, default: null },
    service: { type: String, default: 'api-server' },
    environment: { type: String, default: 'development', index: true },
    release: { type: String, default: 'v1.0.0' },
    requestId: { type: String, default: null },
    context: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { timestamps: true }
);
```
- **Indexes:** `{ issueId: 1, timestamp: -1 }`, `{ projectId: 1, timestamp: -1 }`.

---

## 3. Atomic Ingestion & Compensating Transactions

To ensure high error throughput without distributed two-phase commit overhead, TraceBack executes ingestion in two stages with compensating rollback:

1. **Atomic Upsert:**
   ```javascript
   const issue = await Issue.findOneAndUpdate(
     { projectKey, fingerprint },
     {
       $setOnInsert: { projectKey, projectId, fingerprint, type: eventData.type, firstSeen: now, status: 'unresolved' },
       $set: { projectId: projectId || undefined, message: eventData.message, sampleStackTrace: eventData.stackTrace, lastSeen: now },
       $inc: { count: 1 }
     },
     { upsert: true, new: true, setDefaultsOnInsert: true }
   );
   ```

2. **Event Insertion with Compensating Action:**
   ```javascript
   try {
     await ErrorEvent.create({ issueId: issue._id, projectId, ... });
   } catch (eventErr) {
     // If the detailed event fails to write, roll back the issue counter
     if (issue.count === 1) {
       await Issue.deleteOne({ _id: issue._id });
     } else {
       await Issue.updateOne({ _id: issue._id }, { $inc: { count: -1 } });
     }
     throw eventErr;
   }
   ```
