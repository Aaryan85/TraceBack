/**
 * Stack Trace Parser & Normalizer
 */

/**
 * Parses Error objects into a safe, normalized structure
 */
export function parseError(error) {
  if (!error) {
    return {
      type: 'UnknownError',
      message: 'Unknown error occurred',
      stackTrace: null,
      frames: []
    };
  }

  // Handle non-Error throws (e.g. throw "string", throw { obj })
  if (!(error instanceof Error)) {
    const message = typeof error === 'object' ? JSON.stringify(error) : String(error);
    return {
      type: 'UnhandledRejection',
      message,
      stackTrace: new Error().stack || null,
      frames: []
    };
  }

  const type = error.name || error.constructor?.name || 'Error';
  const message = error.message || 'No error message provided';
  const rawStack = error.stack || '';

  const frames = parseStackFrames(rawStack);

  return {
    type,
    message,
    stackTrace: rawStack,
    frames
  };
}

/**
 * Extracts individual frames from a V8 stack trace
 */
export function parseStackFrames(stack) {
  if (!stack || typeof stack !== 'string') return [];

  const lines = stack.split('\n');
  const frames = [];

  // V8 frame regex matches: " at func (file.js:12:34)" or " at file.js:12:34"
  const frameRegex = /^\s*at\s+(?:(.+?)\s+\((?:node:)?(.*?):(\d+):(\d+)\)|(?:node:)?(.*?):(\d+):(\d+))$/;

  for (const line of lines) {
    const match = line.match(frameRegex);
    if (!match) continue;

    const functionName = match[1] || '<anonymous>';
    const rawPath = match[2] || match[5] || '';
    const lineNumber = parseInt(match[3] || match[6], 10);
    const columnNumber = parseInt(match[4] || match[7], 10);

    // Normalize Windows backslashes
    const normalizedFile = rawPath.replace(/\\/g, '/');

    // Filter out node internals for application frame highlighting
    const isNodeInternal = normalizedFile.startsWith('node:') || !normalizedFile.includes('/');
    const isAppCode = !isNodeInternal && !normalizedFile.includes('node_modules');

    frames.push({
      functionName,
      file: normalizedFile,
      line: lineNumber,
      column: columnNumber,
      isAppCode,
      raw: line.trim()
    });
  }

  return frames;
}
