import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
// TraceBack Engine & API
import { connectDB, getDBStatus } from './db/connection.js';
import { cookieParserMiddleware, requireAuth, optionalAuth } from './middleware/sessionAuth.js';
import { authenticateProjectKey } from './middleware/auth.js';
import { ingestionRateLimiter } from './middleware/rateLimiter.js';
import { ingestEvent } from './controllers/ingestionController.js';
import {
  signup,
  login,
  logout,
  getMe
} from './controllers/authController.js';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  rotateProjectKey
} from './controllers/projectController.js';
import {
  getIssues,
  getIssueById,
  getIssueEvents,
  updateIssueStatus,
  getErrorFrequency
} from './controllers/issuesController.js';

const app = express();

// Security and standard parsing middlewares
app.use(cors({
  origin: [config.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-Key', 'X-Project-Id']
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParserMiddleware);

// --- Ingestion API (Stage 4 & Stage 6 Rate Limiting) ---
app.post('/api/v1/events', ingestionRateLimiter.middleware(), authenticateProjectKey, ingestEvent);

// --- User Authentication APIs (Phase 2) ---
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', requireAuth, getMe);

// --- Multi-Project Workspace APIs (Phase 4) ---
app.get('/api/projects', requireAuth, getProjects);
app.post('/api/projects', requireAuth, createProject);
app.get('/api/projects/:id', requireAuth, getProjectById);
app.patch('/api/projects/:id', requireAuth, updateProject);
app.delete('/api/projects/:id', requireAuth, deleteProject);
app.post('/api/projects/:id/rotate-key', requireAuth, rotateProjectKey);

// --- Dashboard APIs (Stage 4 & Phase 5 Project Scoping) ---
app.get('/api/issues', optionalAuth, getIssues);
app.get('/api/issues/:id', optionalAuth, getIssueById);
app.get('/api/issues/:id/events', optionalAuth, getIssueEvents);
app.patch('/api/issues/:id/status', optionalAuth, updateIssueStatus);
app.get('/api/analytics/error-frequency', optionalAuth, getErrorFrequency);

// Health Check Endpoint (Stage 1 + Stage 2 Database reporting)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'traceback-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: getDBStatus()
  });
});

// Root API information
app.get('/api', (req, res) => {
  res.json({
    name: 'TraceBack API',
    version: '1.0.0',
    database: getDBStatus(),
    documentation: '/api/health'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[TraceBack Server Error]', err);
  }
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

import { fileURLToPath } from 'url';
import path from 'path';

// Check if this script was executed directly from the CLI (e.g. node src/server.js)
const isDirectRun = process.argv[1] && (
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server.js')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  // Connect to MongoDB
  connectDB().catch((err) => {
    console.error('[TraceBack] Failed to initialize MongoDB connection:', err.message);
  });

  app.listen(config.port, () => {
    console.log(`[TraceBack] Ingestion & API server running on http://localhost:${config.port}`);
    console.log(`[TraceBack] Health check available at http://localhost:${config.port}/api/health`);
  });
}

export default app;
