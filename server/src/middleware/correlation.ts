import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '../lib/logger';
import type { Logger } from 'pino';

// Extend Express Request to include logger
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      log: Logger;
    }
  }
}

// Header name for correlation ID (standard header)
const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware that adds correlation ID and request-scoped logger to each request
 * - Extracts existing correlation ID from header or generates new one
 * - Attaches correlation ID to response headers for tracing
 * - Creates child logger with correlation context
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing correlation ID from header or generate new one
  const correlationId = (req.get(CORRELATION_ID_HEADER) as string) || randomUUID();

  // Attach to request for use in handlers
  req.correlationId = correlationId;

  // Create request-scoped logger with correlation ID
  req.log = createRequestLogger(correlationId);

  // Add to response headers for client-side tracing
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}
