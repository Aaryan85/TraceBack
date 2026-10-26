import { Session, User } from '../models/index.js';

/**
 * Lightweight cookie parser for req.headers.cookie
 */
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;

  cookieHeader.split(';').forEach((part) => {
    const [rawName, ...rawValParts] = part.split('=');
    const name = rawName?.trim();
    if (!name) return;
    const value = rawValParts.join('=').trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  });

  return cookies;
}

/**
 * Middleware that parses cookies and attaches req.cookies
 */
export function cookieParserMiddleware(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  next();
}

/**
 * Extracts session ID from cookie or Authorization header
 */
function extractSessionId(req) {
  const cookies = req.cookies || parseCookies(req.headers.cookie);
  if (cookies.tb_session) {
    return cookies.tb_session;
  }

  // Fallback to Bearer token if passed explicitly
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7).trim();
  }

  return null;
}

/**
 * Middleware that requires a valid authenticated user session
 */
export async function requireAuth(req, res, next) {
  try {
    const sessionId = extractSessionId(req);
    if (!sessionId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please log in.'
      });
    }

    const session = await Session.findOne({
      sessionId,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session expired or invalid. Please log in again.'
      });
    }

    const user = await User.findById(session.userId).lean();
    if (!user) {
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Associated user account no longer exists.'
      });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    console.error('[TraceBack Auth Middleware Error]', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to verify authentication session.'
    });
  }
}

/**
 * Middleware that attaches user if session exists, but allows unauthenticated access
 */
export async function optionalAuth(req, res, next) {
  try {
    const sessionId = extractSessionId(req);
    if (sessionId) {
      const session = await Session.findOne({
        sessionId,
        expiresAt: { $gt: new Date() }
      });
      if (session) {
        const user = await User.findById(session.userId).lean();
        if (user) {
          req.user = user;
          req.session = session;
        }
      }
    }
  } catch (err) {
    // Non-blocking for optional auth
    console.warn('[TraceBack Optional Auth Error]', err.message);
  }
  next();
}
