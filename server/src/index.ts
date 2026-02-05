import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter, createContext, expireStaleQuotes } from '@ihms/api';
import { closeDb, checkDbHealth } from '@ihms/db';
import { env } from './env';
import { quotesPdfRouter } from './routes/quotes-pdf';
import { logger, httpLogger, redisLogger, cronLogger } from './lib/logger';
import { correlationMiddleware } from './middleware/correlation';
import { csrfTokenGenerator, csrfProtection } from './middleware/csrf';

const app = express();

// Create Redis client for rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

async function initializeRedis() {
  try {
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            redisLogger.error({ retries }, 'Redis connection failed after max retries, using in-memory rate limiting');
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      redisLogger.error({ err: err.message }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      redisLogger.info('Redis connected for rate limiting');
    });

    redisClient.on('ready', () => {
      redisLogger.info('Redis ready for rate limiting');
    });

    await redisClient.connect();

    redisLogger.info('Redis-backed rate limiting initialized successfully');
  } catch (error) {
    redisLogger.error({ error }, 'Failed to connect to Redis for rate limiting');
    redisLogger.warn('Falling back to in-memory rate limiting. This is not suitable for production with multiple server instances.');
    redisClient = null;
  }
}

// Helper function to create a Redis store with a specific prefix
function createRedisStore(prefix: string): RedisStore | undefined {
  if (!redisClient) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
}

// Initialize Redis before setting up rate limiters
await initializeRedis();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Add correlation ID middleware for request tracing
app.use(correlationMiddleware);

// CSRF Protection (defense-in-depth for cookie-based endpoints)
// Note: tRPC endpoints use JWT Bearer tokens and are immune to CSRF
// This protects REST endpoints that may use cookies in the future
app.use(csrfTokenGenerator);

// Rate limiting for auth endpoints
// Note: tRPC uses POST requests with procedure names in the path for non-batched requests
// and in the request body for batched requests. We handle both cases.

// Helper to check if request is for a specific auth procedure
const isAuthProcedure = (req: express.Request, procedureName: string): boolean => {
  // Check URL path for non-batched requests (e.g., /trpc/auth.login)
  if (req.path.includes(`auth.${procedureName}`)) {
    return true;
  }

  // Check request body for batched requests
  if (req.body && typeof req.body === 'object') {
    // Single batched request: { "0": { "json": {...}, "meta": {...} } }
    const batch = req.body;
    for (const key in batch) {
      const item = batch[key];
      if (item?.json || item?.meta) {
        // Check if the path contains our procedure
        const itemPath = item?.meta?.path || '';
        if (itemPath.includes(`auth.${procedureName}`)) {
          return true;
        }
      }
    }
  }

  return false;
};

const loginLimiter = rateLimit({
  store: createRedisStore('login'), // Create separate Redis store with prefix
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isAuthProcedure(req, 'login'),
  // Use a custom key generator that includes the email if available, with IPv6 support
  keyGenerator: (req, _res) => {
    const ip = ipKeyGenerator(req.ip ?? 'unknown');
    const email = req.body?.[0]?.json?.email || req.body?.email;
    return email ? `${ip}:${email}` : ip;
  },
});

const registerLimiter = rateLimit({
  store: createRedisStore('register'), // Create separate Redis store with prefix
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per window per IP
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isAuthProcedure(req, 'register'),
  keyGenerator: (req, _res) => ipKeyGenerator(req.ip ?? 'unknown'),
});

const refreshLimiter = rateLimit({
  store: createRedisStore('refresh'), // Create separate Redis store with prefix
  windowMs: 1 * 60 * 1000, // 1 minute (changed from 15 minutes per requirements)
  max: 10, // 10 attempts per window per IP
  message: { error: 'Too many token refresh attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isAuthProcedure(req, 'refresh'),
  keyGenerator: (req, _res) => ipKeyGenerator(req.ip ?? 'unknown'),
});

// Apply rate limiters to tRPC endpoints
// These will only trigger for their specific auth procedures due to the skip function
app.use('/trpc', loginLimiter);
app.use('/trpc', registerLimiter);
app.use('/trpc', refreshLimiter);

// Health check endpoint with database connectivity
app.get('/health', async (_req, res) => {
  const dbHealth = await checkDbHealth();

  const status = dbHealth.connected ? 'ok' : 'degraded';
  const statusCode = dbHealth.connected ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: dbHealth.connected ? 'connected' : 'disconnected',
    ...(dbHealth.error && { dbError: dbHealth.error }),
  });
});

// REST API routes with CSRF protection
// Note: PDF endpoints use Bearer token auth, but we apply CSRF for defense-in-depth
app.use('/api/quotes', csrfProtection, quotesPdfRouter);

// tRPC handler
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Start server
const server = app.listen(env.PORT, () => {
  httpLogger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  httpLogger.info({ trpcEndpoint: `http://localhost:${env.PORT}/trpc` }, 'tRPC endpoint available');
});

// Background job: Expire stale quotes
// Run on startup
expireStaleQuotes(env.QUOTE_EXPIRATION_DAYS)
  .then((count) => {
    cronLogger.info(
      { count, expirationDays: env.QUOTE_EXPIRATION_DAYS, event: 'startup' },
      'Expired stale quotes on startup'
    );
  })
  .catch((error) => {
    cronLogger.error({ error, event: 'startup' }, 'Failed to expire quotes on startup');
  });

// Run every hour
const EXPIRE_QUOTES_INTERVAL = 60 * 60 * 1000; // 1 hour
let expireQuotesIntervalId: NodeJS.Timeout | null = null;

expireQuotesIntervalId = setInterval(async () => {
  try {
    const count = await expireStaleQuotes(env.QUOTE_EXPIRATION_DAYS);
    if (count > 0) {
      cronLogger.info(
        { count, expirationDays: env.QUOTE_EXPIRATION_DAYS },
        'Expired stale quotes'
      );
    }
  } catch (error) {
    cronLogger.error({ error }, 'Failed to expire quotes');
  }
}, EXPIRE_QUOTES_INTERVAL);

// Graceful shutdown - clean up connections properly
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  // Stop background jobs
  if (expireQuotesIntervalId) {
    clearInterval(expireQuotesIntervalId);
    cronLogger.info('Background jobs stopped');
  }

  // Stop accepting new connections
  server.close(async () => {
    httpLogger.info('HTTP server closed');

    // Close Redis connection
    if (redisClient) {
      try {
        await redisClient.quit();
        redisLogger.info('Redis connection closed');
      } catch (error) {
        redisLogger.error({ error }, 'Error closing Redis connection');
      }
    }

    // Close database connections
    await closeDb();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
