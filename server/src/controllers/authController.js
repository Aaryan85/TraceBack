import { User, Session, Project } from '../models/index.js';
import { hashPassword, verifyPassword, generateSessionId, generateProjectKey } from '../services/passwordService.js';
import { config } from '../config/index.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Helper to set the HTTP-only session cookie
 */
function getSessionCookieOptions() {
  const isProduction = config.nodeEnv === 'production' || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SESSION_DURATION_MS,
    path: '/'
  };
}

function setSessionCookie(res, sessionId) {
  res.cookie('tb_session', sessionId, getSessionCookieOptions());
}

/**
 * Helper to clear session cookie
 */
function clearSessionCookie(res) {
  const isProduction = config.nodeEnv === 'production' || process.env.NODE_ENV === 'production';
  res.clearCookie('tb_session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  });
}

/**
 * POST /api/auth/signup
 */
export async function signup(req, res) {
  try {
    const { name, email, password } = req.body || {};

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Name is required.'
      });
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A valid email address is required.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Password must be at least 8 characters long.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Reject duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Hash password securely using scrypt
    const passwordHash = await hashPassword(password);

    // 4. Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    // 5. Create default initial project for the user
    const defaultProject = await Project.create({
      name: 'Default Project',
      description: 'Initial workspace project',
      owner: user._id,
      apiKey: generateProjectKey()
    });

    // 6. Create session
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await Session.create({
      sessionId,
      userId: user._id,
      expiresAt
    });

    // 7. Set cookie & respond
    setSessionCookie(res, sessionId);

    return res.status(201).json({
      status: 'success',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      defaultProject: {
        _id: defaultProject._id,
        name: defaultProject.name,
        apiKey: defaultProject.apiKey
      }
    });
  } catch (err) {
    console.error('[TraceBack Signup Error]', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to create user account.'
    });
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    }

    // 2. Verify password with timingSafeEqual
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    }

    // 3. Create new session
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await Session.create({
      sessionId,
      userId: user._id,
      expiresAt
    });

    // 4. Set cookie & respond
    setSessionCookie(res, sessionId);

    return res.status(200).json({
      status: 'success',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('[TraceBack Login Error]', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to authenticate user.'
    });
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  try {
    const sessionId = req.cookies?.tb_session || req.headers.authorization?.slice(7)?.trim();
    if (sessionId) {
      await Session.deleteOne({ sessionId });
    }

    clearSessionCookie(res);

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.'
    });
  } catch (err) {
    console.error('[TraceBack Logout Error]', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to complete logout.'
    });
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  return res.status(200).json({
    status: 'success',
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt
    }
  });
}
