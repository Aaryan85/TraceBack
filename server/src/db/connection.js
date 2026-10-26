import mongoose from 'mongoose';
import { config } from '../config/index.js';

let isConnected = false;

/**
 * Connect to MongoDB with resilient connection handling
 */
export async function connectDB(uri = config.mongoUri) {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('[TraceBack DB] MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      console.error('[TraceBack DB] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[TraceBack DB] MongoDB disconnected');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    isConnected = false;
    console.error('[TraceBack DB] Initial MongoDB connection failed:', err.message);
    // In dev mode, allow server to boot and retry in background
    return null;
  }
}

/**
 * Disconnect from MongoDB (useful for test suites and graceful shutdowns)
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

/**
 * Check current database connection status string
 */
export function getDBStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}
