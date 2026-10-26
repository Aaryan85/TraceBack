# TraceBack — System Architecture Diagrams & Flowcharts

This document contains the official architectural diagrams and operational flowcharts for **TraceBack**, formatted in GitHub-compatible Mermaid markdown.

---

## Diagram 1 — System Architecture

The following diagram illustrates the relationship between the monitored client application, the custom TraceBack Node.js SDK, the Express ingestion and dashboard servers, the MongoDB persistence layer, and the React frontend.

```mermaid
graph TB
    subgraph MonitoredApp["Monitored Host Application (e.g. Express API)"]
        AppLogic["Application Routes & Services"]
        SDK["@traceback/node SDK"]
        ReqHandler["TraceBack.requestHandler()"]
        ErrHandler["TraceBack.errorHandler()"]
        Redactor["Sensitive Data Redactor"]
        Transport["Async Batch Transport"]
    end

    subgraph TraceBackBackend["TraceBack Backend Server (:3000)"]
        IngestEndpoint["POST /api/v1/events"]
        AuthMiddleware["authenticateProjectKey<br/>(X-Project-Key / Bearer)"]
        RateLimiter["Ingestion Rate Limiter<br/>(150 req/min sliding window)"]
        Sanitizer["Payload Validator & Sanitizer<br/>(Deep PII Redaction)"]
        Fingerprinter["Fingerprint Service<br/>(SHA-256 Deterministic Hash)"]
        
        DashboardAPI["Dashboard REST Endpoints<br/>(/api/issues, /api/analytics)"]
    end

    subgraph Persistence["MongoDB Database (:27017)"]
        IssueModel[("Issue Collection<br/>• projectKey + fingerprint (unique)<br/>• type, count, status, lastSeen")]
        EventModel[("ErrorEvent Collection<br/>• issueId (ref), timestamp<br/>• stackTrace, context, runtime")]
    end

    subgraph TraceBackClient["TraceBack Dashboard Frontend (:5173)"]
        ReactApp["React 18 + Vite SPA"]
        OverviewPage["System Overview & Telemetry"]
        IssuesPage["Issue Tracker & Triage Table"]
        DetailPage["Issue Detail & Stack Inspector"]
        SetupPage["Project Setup & SDK Guide"]
        PublicLanding["Public Marketing Homepage"]
    end

    %% Flow connections
    AppLogic --> ReqHandler
    AppLogic --> ErrHandler
    ReqHandler -. Context .-> SDK
    ErrHandler --> SDK
    SDK --> Redactor
    Redactor --> Transport

    Transport -- "HTTP POST (JSON)" --> IngestEndpoint
    IngestEndpoint --> RateLimiter
    RateLimiter --> AuthMiddleware
    AuthMiddleware --> Sanitizer
    Sanitizer --> Fingerprinter
    Fingerprinter --> IssueModel
    IssueModel --> EventModel

    DashboardAPI --> IssueModel
    DashboardAPI --> EventModel
    ReactApp --> DashboardAPI
    OverviewPage --> ReactApp
    IssuesPage --> ReactApp
    DetailPage --> ReactApp
    SetupPage --> ReactApp
    PublicLanding --> ReactApp
```

---

## Diagram 2 — Error Ingestion Flowchart

This flowchart details the complete lifecycle of an error event from initial throw to database persistence, including all failure paths and compensating rollback logic.

```mermaid
flowchart TD
    Start([Application Throws Unhandled Error]) --> SDKCatch["SDK catches error via errorHandler() or captureException()"]
    SDKCatch --> SDKParse["Extract error name, message & stack frames"]
    SDKParse --> SDKRedact["Client-Side Redactor masks blacklisted keys (passwords, tokens, cards)"]
    SDKRedact --> SDKPack["Construct payload with runtime telemetry (OS, Node version, route)"]
    SDKPack --> HTTPSend["HTTP POST /api/v1/events with X-Project-Key"]

    HTTPSend --> RateCheck{"Exceeds Rate Limit?<br/>(> 150 req/min)"}
    RateCheck -- Yes --> Resp429["Return 429 Too Many Requests<br/>(Retry-After header)"]
    RateCheck -- No --> AuthCheck{"Valid Project Key?<br/>(X-Project-Key == PROJECT_KEY)"}

    AuthCheck -- No --> Resp401["Return 401 Unauthorized<br/>(Invalid or missing project key)"]
    AuthCheck -- Yes --> ValidateCheck{"Valid Schema Payload?<br/>(type, message <= 2000 chars)"}

    ValidateCheck -- No --> Resp400["Return 400 Bad Request<br/>(Validation error details)"]
    ValidateCheck -- Yes --> ServerSanitize["Server-Side Deep Redactor & Normalization"]

    ServerSanitize --> GenFingerprint["Generate Fingerprint:<br/>1. Normalize dynamic numbers, UUIDs, hex<br/>2. Filter internal stack frames<br/>3. Compute SHA-256 hash"]

    GenFingerprint --> UpsertIssue["Issue.findOneAndUpdate(<br/>{ projectKey, fingerprint },<br/>{ $inc: { count: 1 }, $set: { lastSeen, ... } },<br/>{ upsert: true })"]

    UpsertIssue --> SaveEvent["ErrorEvent.create({ issueId: issue._id, ... })"]

    SaveEvent -- Success --> Resp201["Return 201 Created<br/>{ eventId, issueId, fingerprint, count, isNewIssue }"]
    SaveEvent -- DB Failure --> Rollback["Compensating Rollback:<br/>Decrement issue.count or delete if count == 1"]
    Rollback --> Resp500["Return 500 IngestionError"]

    %% Styling
    classDef success fill:#F0FDF4,stroke:#16A34A,stroke-width:1.5px;
    classDef error fill:#FEF2F2,stroke:#DC2626,stroke-width:1.5px;
    class Resp201 success;
    class Resp429,Resp401,Resp400,Resp500 error;
```

---

## Diagram 3 — Issue Investigation Flowchart

This flowchart outlines how a software engineer interacts with the TraceBack dashboard to triage, analyze, and resolve an incident.

```mermaid
flowchart TD
    DevStart([Developer Opens TraceBack Dashboard]) --> DashNav{"Select View"}
    
    DashNav -->|Overview| ViewOverview["Review 24h Error Frequency Histogram & Top Issues"]
    DashNav -->|Issues| ViewIssueList["Examine Paginated Issue Triage Table"]
    
    ViewIssueList --> FilterIssues["Apply Filters:<br/>• Status (unresolved, resolved, ignored)<br/>• Environment (production, development)<br/>• Search (query by error name or message)"]
    
    FilterIssues --> SelectIssue["Click Issue Row to open Issue Detail"]
    ViewOverview --> SelectIssue
    
    SelectIssue --> InspectHeader["Inspect Issue Metadata:<br/>• Error Type & Normalized Message<br/>• Total Occurrences & Affected Environment<br/>• First Seen & Last Seen Timestamps"]
    
    InspectHeader --> InspectStack["Analyze Filtered Stack Trace:<br/>• Offending file path, line number, column<br/>• Node runtime internals hidden"]
    
    InspectStack --> InspectContext["Inspect Sanitized Occurrence Context:<br/>• HTTP Route & Method<br/>• Request Headers (Tokens redacted)<br/>• Node runtime & platform details"]
    
    InspectContext --> ReviewHistory["Browse Historical Occurrence Timeline<br/>(Paginated GET /api/issues/:id/events)"]
    
    ReviewHistory --> TriageAction{"Decide Action"}
    
    TriageAction -->|Fix Deployed| MarkResolved["Set Status to 'Resolved'<br/>(PATCH /api/issues/:id/status)"]
    TriageAction -->|Expected / Non-critical| MarkIgnored["Set Status to 'Ignored'<br/>(PATCH /api/issues/:id/status)"]
    TriageAction -->|Needs Investigation| KeepUnresolved["Keep Status as 'Unresolved'"]
    
    MarkResolved --> EndState([Issue Updated & Logged])
    MarkIgnored --> EndState
    KeepUnresolved --> EndState
```

---

## Diagram 4 — Entity Relationship Diagram (ERD)

This diagram details the implemented Mongoose schemas, relationships, data types, and compound indexes.

```mermaid
erDiagram
    %% ==========================================
    %% ACTIVE IMPLEMENTED MONGOOSE SCHEMAS
    %% ==========================================

    USER {
        ObjectId _id PK
        String name "Full user name"
        String email "Normalized unique lowercase email"
        String passwordHash "scrypt hash (salt:derivedKey)"
        Date createdAt "Mongoose auto-timestamp"
        Date updatedAt "Mongoose auto-timestamp"
    }

    SESSION {
        ObjectId _id PK
        String sessionId "Unique 256-bit token (indexed)"
        ObjectId userId FK "References USER._id"
        Date expiresAt "TTL index (expireAfterSeconds: 0)"
        Date createdAt "Mongoose auto-timestamp"
    }

    PROJECT {
        ObjectId _id PK
        String name "Project display name"
        String description "Optional service summary"
        ObjectId owner FK "References USER._id (indexed)"
        String apiKey "Unique ingestion secret tb_live_<hex>"
        String status "Enum: 'active' | 'archived'"
        Date createdAt "Mongoose auto-timestamp"
        Date updatedAt "Mongoose auto-timestamp"
    }

    ISSUE {
        ObjectId _id PK
        ObjectId projectId FK "References PROJECT._id (indexed)"
        String projectKey "Tenant boundary identifier"
        String fingerprint "SHA-256 hash (64 hex chars)"
        String type "Exception name (e.g. TypeError)"
        String message "Normalized error message"
        String sampleStackTrace "Latest stack snippet"
        Number count "Occurrence count (min: 1)"
        String status "Enum: 'unresolved' | 'resolved' | 'ignored'"
        Date firstSeen "Timestamp of first event"
        Date lastSeen "Timestamp of most recent event"
        String release "Semantic release tag (e.g. v1.2.4)"
        String environment "e.g. production, development"
        Date createdAt "Mongoose auto-timestamp"
        Date updatedAt "Mongoose auto-timestamp"
    }

    ERROREVENT {
        ObjectId _id PK
        ObjectId issueId FK "References ISSUE._id"
        ObjectId projectId FK "References PROJECT._id (indexed)"
        String fingerprint "Indexed copy of SHA-256 hash"
        String projectKey "Tenant boundary identifier"
        Date timestamp "Event occurrence timestamp"
        String type "Exception class name"
        String message "Raw event message"
        String stackTrace "Full unparsed stack trace"
        String route "e.g. GET /api/orders"
        String service "Name of reporting service"
        String environment "Environment tag"
        String release "Release tag"
        String requestId "Optional trace/request identifier"
        Mixed context "Sanitized arbitrary JSON payload"
        Date createdAt "Mongoose auto-timestamp"
    }

    %% Relationships between active models
    USER ||--o{ SESSION : "maintains active sessions"
    USER ||--o{ PROJECT : "owns"
    PROJECT ||--o{ ISSUE : "contains"
    PROJECT ||--o{ ERROREVENT : "scopes"
    ISSUE ||--o{ ERROREVENT : "groups 1 to many occurrences"
```

### Active Indexing Strategy in Production

| Collection | Indexed Fields | Options | Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `{ email: 1 }` | `unique: true` | Fast login lookup and prevention of duplicate accounts |
| `sessions` | `{ sessionId: 1 }` | `unique: true` | O(1) session verification on authenticated requests |
| `sessions` | `{ expiresAt: 1 }` | `expireAfterSeconds: 0` | Automatic background MongoDB cleanup of expired sessions |
| `projects` | `{ apiKey: 1 }` | `unique: true` | Sub-millisecond verification of SDK ingestion credentials |
| `projects` | `{ owner: 1, status: 1, createdAt: -1 }` | `background: true` | Fast retrieval of user's active workspaces |
| `issues` | `{ projectKey: 1, fingerprint: 1 }` | `unique: true` | Prevents duplicate grouping races; guarantees deterministic issue identity |
| `issues` | `{ projectId: 1, status: 1, lastSeen: -1 }` | `background: true` | Optimizes project-scoped dashboard issue queries |
| `errorevents` | `{ issueId: 1, timestamp: -1 }` | `background: true` | Optimizes chronological history pagination per issue |
| `errorevents` | `{ projectId: 1, timestamp: -1 }` | `background: true` | Fast project-scoped 24-hour error frequency aggregation |
