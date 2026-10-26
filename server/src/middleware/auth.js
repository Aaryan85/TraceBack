import { config } from '../config/index.js';
import { Project } from '../models/index.js';

/**
 * Middleware to authenticate inbound ingestion events via project key
 * Validates dynamic keys against active projects in MongoDB, with fallback
 * to config.projectKey for backward compatibility.
 */
export async function authenticateProjectKey(req, res, next) {
  let providedKey = req.headers['x-project-key'];

  if (!providedKey && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    }
  }

  if (!providedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing project key. Provide via X-Project-Key header or Bearer token.'
    });
  }

  // 1. Look up dynamic project in MongoDB
  try {
    const project = await Project.findOne({ apiKey: providedKey, status: 'active' });
    if (project) {
      req.project = project;
      req.projectId = project._id;
      req.projectKey = project.apiKey;
      return next();
    }
  } catch (err) {
    // Non-blocking log if DB connection error
    console.warn('[TraceBack Auth] Project lookup error:', err.message);
  }

  // 2. Fallback for static default demo key or test environment
  if (providedKey === config.projectKey) {
    req.projectKey = providedKey;
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid project key provided.'
  });
}
