import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter, createContext } from '@ihms/api';
import { closeDb, checkDbHealth } from '@ihms/db';
import { env } from './env';
import { quotesPdfRouter } from './routes/quotes-pdf';

const app = express();

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
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.includes('auth.login'),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per window
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.includes('auth.register'),
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many token refresh attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.includes('auth.refresh'),
});

// Apply rate limiters to tRPC endpoints
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

// Graceful shutdown - clean up connections properly
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

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
