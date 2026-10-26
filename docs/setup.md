# TraceBack — Local Setup & Deployment Guide

This guide walks through configuring, running, and verifying the complete TraceBack stack in local development and production environments.

---

## 1. System Prerequisites

Before starting, ensure your host environment meets the following minimum requirements:

- **Node.js:** `v18.0.0` or higher (tested on Node `v20.x` LTS)
- **npm:** `v9.0.0` or higher (supports npm workspaces)
- **Database:** Local MongoDB instance (`v6.0+`) **OR** a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- **Operating System:** macOS, Linux, or Windows (PowerShell / Command Prompt)

---

## 2. Repository Installation

Clone the repository and install all workspace packages from the root directory:

```bash
git clone <repository-url> traceback
cd traceback

# Install all dependencies across client, server, demo-app, and packages in one step
npm install
```

The repository uses npm workspaces defined in `package.json`:
- `server/` (Express API)
- `client/` (React SPA)
- `packages/traceback-node/` (SDK)
- `demo-app/` (Sample monitored service)

---

## 3. Environment Variable Configuration

Create `.env` files in both the `server/` and `demo-app/` directories by copying their respective templates:

### A. Server Configuration (`server/.env`)

```bash
cp server/.env.example server/.env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the Ingestion Engine and Dashboard REST API. |
| `MONGODB_URI` | `mongodb://localhost:27017/traceback` | MongoDB connection string (Local or MongoDB Atlas). |
| `PROJECT_KEY` | `tb_live_demo_key_9823748293` | Secret project key used to authenticate ingestion requests. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for the React dashboard. |
| `NODE_ENV` | `development` | Runtime mode: `development`, `test`, or `production`. |

### B. Demo Application Configuration (`demo-app/.env`)

```bash
cp demo-app/.env.example demo-app/.env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port on which the demo application listens. |
| `TRACEBACK_ENDPOINT` | `http://localhost:3000/api/v1/events` | Ingestion endpoint target. |
| `TRACEBACK_PROJECT_KEY` | `tb_live_demo_key_9823748293` | Must match `server`'s `PROJECT_KEY`. |
| `TRACEBACK_ENVIRONMENT` | `production` | Environment tag attached to reported errors. |
| `TRACEBACK_RELEASE` | `v1.2.4` | Semantic release tag attached to errors. |

---

## 4. Database Setup

### Option 1: Local MongoDB (Recommended for Offline Dev)
If running MongoDB locally, start the daemon:
```bash
# macOS (Homebrew)
brew services start mongodb/brew/mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name traceback-mongo mongo:7.0
```

### Option 2: MongoDB Atlas (Cloud Database)
1. Create a free M0 cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with read/write permissions.
3. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for development).
4. Under **Database Deployment** -> **Connect** -> **Drivers**, copy the connection string.
5. Update `server/.env`:
   ```ini
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-subdomain>.mongodb.net/traceback?retryWrites=true&w=majority
   ```

---

## 5. Running the Applications

Open separate terminal windows or use root workspace scripts:

### Running the Backend Server
```bash
# From workspace root:
npm run dev:server

# Or directly in server/:
cd server
npm run dev
```
- Server starts at `http://localhost:3000`
- Health check available at `http://localhost:3000/api/health`

### Running the Frontend Dashboard
```bash
# From workspace root:
npm run dev:client

# Or directly in client/:
cd client
npm run dev
```
- Dashboard runs at `http://localhost:5173`

### Running the Monitored Demo Application
```bash
# From workspace root:
npm run dev:demo

# Or directly in demo-app/:
cd demo-app
npm run dev
```
- Demo API runs at `http://localhost:4000`

---

## 6. Triggering Test Errors

Verify the end-to-end pipeline by triggering intentional crashes in the demo application:

### A. Unhandled TypeError
```bash
curl http://localhost:4000/error/type-error
```
*Triggers an unhandled null pointer read in `demo-app/src/app.js`.*

### B. Validation Error with Sensitive Password Context
```bash
curl -X POST http://localhost:4000/error/validation-error
```
*Dispatches a validation error containing passwords that verify automatic in-flight redaction.*

### C. Simulated Database Timeout
```bash
curl http://localhost:4000/error/db-sim
```
*Simulates a 5000ms database timeout and verifies grouping on normalized queries.*

### D. Custom Warning Message
```bash
curl http://localhost:4000/error/custom-message
```
*Dispatches an informational warning via `TraceBack.captureMessage()`.*

---

## 7. Running Automated Test Suites

TraceBack uses the native Node.js test runner (`node:test` and `node:assert/strict`) for lightning-fast, zero-dependency testing.

```bash
# Run all workspace test suites
npm run test:all

# Run server unit and integration tests
npm run test:server

# Run SDK parser, redactor, and facade tests
npm run test:sdk

# Run demo application instrumentation tests
npm run test:demo
```
