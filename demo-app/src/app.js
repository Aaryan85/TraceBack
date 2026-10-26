import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TraceBack } from '../../packages/traceback-node/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback

const app = express();
const port = parseInt(process.env.PORT || '4000', 10);
const activeProjectKey = process.env.TRACEBACK_PROJECT_KEY || 'tb_live_demo_key_9823748293';

// 1. Initialize TraceBack SDK
TraceBack.init({
  endpoint: process.env.TRACEBACK_ENDPOINT || 'http://localhost:3000/api/v1/events',
  projectKey: activeProjectKey,
  environment: process.env.TRACEBACK_ENVIRONMENT || 'production',
  release: process.env.TRACEBACK_RELEASE || 'v1.2.4',
  service: 'demo-ecommerce-api'
});

app.use(cors());
app.use(express.json());

// 2. TraceBack Request Context Middleware
app.use(TraceBack.requestHandler());

// Index: Interactive route guide
app.get('/', (req, res) => {
  res.json({
    service: 'TraceBack Monitored Demo Service',
    status: 'online',
    instrumentation: {
      sdk: '@traceback/node',
      endpoint: process.env.TRACEBACK_ENDPOINT || 'http://localhost:3000/api/v1/events',
      environment: process.env.TRACEBACK_ENVIRONMENT || 'production'
    },
    routes: {
      healthy: 'GET /health',
      typeError: 'GET /error/type-error',
      validationError: 'POST /error/validation-error (or GET /error/validation-error)',
      databaseError: 'GET /error/db-sim',
      customMessage: 'GET /error/custom-message'
    }
  });
});

// Healthy route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'traceback-demo-app',
    timestamp: new Date().toISOString()
  });
});

// Route 1: Real unhandled TypeError
app.get('/error/type-error', (req, res, next) => {
  try {
    const userSession = null;
    // Intentional crash: Cannot read properties of null
    const role = userSession.role.toUpperCase();
    res.json({ role });
  } catch (err) {
    next(err);
  }
});

// Route 2: Validation Error with structured context
app.all('/error/validation-error', (req, res, next) => {
  const validationError = new Error('Invalid registration payload: email is required and password is too short');
  validationError.name = 'ValidationError';
  validationError.statusCode = 400;

  // Context with sensitive password that MUST be redacted
  const context = {
    route: 'POST /api/auth/register',
    submittedBody: {
      username: 'john_doe',
      email: null,
      password: 'super-secret-password-123'
    },
    failedFields: ['email', 'password']
  };

  TraceBack.captureException(validationError, context);

  res.status(400).json({
    error: 'ValidationError',
    message: validationError.message,
    capturedByTraceBack: true
  });
});

// Route 3: Simulated Database Timeout Error
app.get('/error/db-sim', (req, res, next) => {
  const dbError = new Error('Query timed out after 5000ms: SELECT * FROM orders WHERE status = "pending" ORDER BY created_at DESC');
  dbError.name = 'DatabaseTimeoutError';
  dbError.code = 'ETIMEDOUT';

  TraceBack.captureException(dbError, {
    route: 'GET /api/orders/pending',
    query: 'SELECT * FROM orders WHERE status = "pending"',
    database: 'production_main_postgres',
    poolUtilization: '98%'
  });

  res.status(503).json({
    error: 'DatabaseTimeoutError',
    message: 'Simulated database timeout occurred and event was dispatched to TraceBack.',
    capturedByTraceBack: true
  });
});

// Route 4: Custom Informational / Warning message
app.get('/error/custom-message', (req, res) => {
  TraceBack.captureMessage('High memory consumption detected in worker thread', 'warning', {
    heapUsedMB: 842,
    thresholdMB: 800
  });

  res.json({
    status: 'logged',
    message: 'Captured custom warning message in TraceBack'
  });
});

// 3. TraceBack Error Handler Middleware
app.use(TraceBack.errorHandler());

// Final Express error response
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message,
    timestamp: new Date().toISOString(),
    monitored: true
  });
});

const isDirectRun = process.argv[1] && (
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('app.js')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[TraceBack Demo] Monitored application running on http://localhost:${port}`);
    console.log(`[TraceBack Demo] Ingesting to project key: ${activeProjectKey}`);
  });
}

export default app;
