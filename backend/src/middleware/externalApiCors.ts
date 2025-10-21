import cors from 'cors';

/**
 * CORS configuration for External API (Feature 018)
 *
 * Localhost-only configuration for testing with AI tools like Claude Desktop.
 * Allows wildcard ports for flexibility in AI tool configurations.
 *
 * Security:
 * - Localhost only (127.0.0.1 and localhost)
 * - No credentials (testing prototype)
 * - Wildcard ports for AI tool flexibility
 */

const allowedOrigins = [
  /^http:\/\/localhost:\d+$/,        // http://localhost:<any-port>
  /^http:\/\/127\.0\.0\.1:\d+$/,     // http://127.0.0.1:<any-port>
  /^https:\/\/localhost:\d+$/,       // https://localhost:<any-port>
  /^https:\/\/127\.0\.0\.1:\d+$/,    // https://127.0.0.1:<any-port>
];

export const externalApiCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, Postman, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some((pattern) => pattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy (localhost only)`));
    }
  },
  credentials: false, // No credentials for testing prototype
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-View-Mode', 'X-Confirmation-Token'],
  exposedHeaders: ['X-Operation-ID'],
  maxAge: 86400, // 24 hours
});
