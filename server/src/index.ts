import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter, createContext, expireStaleQuotes } from '@ihms/api';
import { closeDb, checkDbHealth } from '@ihms/db';
import { env } from './env';
import { quotesPdfRouter } from './routes/quotes-pdf';

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
            console.error('Redis connection failed after 10 retries, using in-memory rate limiting');
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected for rate limiting');
    });

    redisClient.on('ready', () => {
      console.log('Redis ready for rate limiting');
    });

    await redisClient.connect();

    console.log('Redis-backed rate limiting initialized successfully');
  } catch (error) {
    console.error('Failed to connect to Redis for rate limiting:', error);
    console.warn('⚠️ WARNING: Falling back to in-memory rate limiting. This is not suitable for production with multiple server instances.');
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

// REST API routes
app.use('/api/quotes', quotesPdfRouter);

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
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`tRPC endpoint: http://localhost:${env.PORT}/trpc`);
});

// Background job: Expire stale quotes
// Run on startup
expireStaleQuotes()
  .then((count) => {
    console.log(`[STARTUP] Expired ${count} stale quotes`);
  })
  .catch((error) => {
    console.error('[STARTUP] Failed to expire quotes:', error);
  });

// Run every hour
const EXPIRE_QUOTES_INTERVAL = 60 * 60 * 1000; // 1 hour
let expireQuotesIntervalId: NodeJS.Timeout | null = null;

expireQuotesIntervalId = setInterval(async () => {
  try {
    const count = await expireStaleQuotes();
    if (count > 0) {
      console.log(`[CRON] Expired ${count} quotes`);
    }
  } catch (error) {
    console.error('[CRON] Failed to expire quotes:', error);
  }
}, EXPIRE_QUOTES_INTERVAL);

// Graceful shutdown - clean up connections properly
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);

  // Stop background jobs
  if (expireQuotesIntervalId) {
    clearInterval(expireQuotesIntervalId);
    console.log('Background jobs stopped');
  }

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    // Close Redis connection
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log('Redis connection closed');
      } catch (error) {
        console.error('Error closing Redis connection:', error);
      }
    }

    // Close database connections
    await closeDb();

    console.log('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
