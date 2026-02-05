import type { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash } from 'crypto';
import { securityLogger } from '../lib/logger';

/**
 * CSRF Protection Middleware
 *
 * IMPORTANT: This application uses JWT Bearer tokens stored in localStorage,
 * which are inherently immune to CSRF attacks because:
 * 1. Attackers cannot read localStorage from cross-origin requests (Same-Origin Policy)
 * 2. Bearer tokens must be explicitly added to request headers (not auto-sent like cookies)
 * 3. CSRF exploits rely on the browser automatically sending credentials (cookies)
 *
 * This middleware exists as a defense-in-depth measure for:
 * - Future cookie-based authentication endpoints
 * - REST endpoints that may use session cookies
 * - Compliance with security best practices
 *
 * Implementation: Double Submit Cookie Pattern
 * - Generates a cryptographically secure CSRF token
 * - Stores token in cookie (httpOnly for defense) and returns in response
 * - Validates token on state-changing requests (POST, PUT, DELETE, PATCH)
 * - Exempts tRPC endpoints (Bearer token authenticated)
 */

// Extend Express Request to include CSRF token
declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SECRET_COOKIE_NAME = '_csrf-secret';

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): { token: string; secret: string } {
  const secret = randomBytes(32).toString('hex');
  const token = randomBytes(32).toString('hex');
  return { token, secret };
}

/**
 * Verify CSRF token using HMAC comparison
 */
function verifyCsrfToken(token: string, secret: string, providedToken: string): boolean {
  if (!token || !secret || !providedToken) {
    return false;
  }

  // Use time-safe comparison to prevent timing attacks
  const expectedHash = createHash('sha256').update(token + secret).digest('hex');
  const providedHash = createHash('sha256').update(providedToken + secret).digest('hex');

  // Constant-time comparison
  if (expectedHash.length !== providedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < expectedHash.length; i++) {
    result |= expectedHash.charCodeAt(i) ^ providedHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if request should be exempt from CSRF validation
 */
function isExemptFromCsrf(req: Request): boolean {
  // Exempt safe HTTP methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  // Exempt tRPC endpoints (use Bearer token auth, immune to CSRF)
  if (req.path.startsWith('/trpc')) {
    return true;
  }

  // Exempt health check
  if (req.path === '/health') {
    return true;
  }

  return false;
}

/**
 * Middleware to generate and attach CSRF token to requests
 * Call this early in your middleware chain
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  // Check if CSRF token already exists in cookie
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  let secret = req.cookies?.[CSRF_SECRET_COOKIE_NAME];

  // Generate new token if missing
  if (!token || !secret) {
    const generated = generateCsrfToken();
    token = generated.token;
    secret = generated.secret;

    // Set token in cookie (readable by JavaScript for including in requests)
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JS to include in headers
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Strong CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Set secret in httpOnly cookie (not readable by JavaScript)
    res.cookie(CSRF_SECRET_COOKIE_NAME, secret, {
      httpOnly: true, // Cannot be read by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // Attach token to request for use in handlers
  req.csrfToken = token;

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Call this after cookie-parser and csrfTokenGenerator
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip validation for exempt requests
  if (isExemptFromCsrf(req)) {
    return next();
  }

  // Get tokens from cookies and headers
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const secretFromCookie = req.cookies?.[CSRF_SECRET_COOKIE_NAME];
  const tokenFromHeader = req.get(CSRF_HEADER_NAME) || req.body?._csrf;

  // Validate token presence
  if (!tokenFromCookie || !secretFromCookie) {
    securityLogger.warn(
      {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip,
      },
      'CSRF validation failed: missing token cookies'
    );
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'No CSRF token found in cookies',
    });
    return;
  }

  if (!tokenFromHeader) {
    securityLogger.warn(
      {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip,
      },
      'CSRF validation failed: missing token header'
    );
    res.status(403).json({
      error: 'CSRF token required',
      message: 'CSRF token must be provided in X-CSRF-Token header or _csrf body field',
    });
    return;
  }

  // Verify token
  if (!verifyCsrfToken(tokenFromCookie, secretFromCookie, tokenFromHeader)) {
    securityLogger.error(
      {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip,
      },
      'CSRF validation failed: invalid token'
    );
    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed',
    });
    return;
  }

  // Token is valid
  next();
}

/**
 * Helper function to get CSRF token for rendering in templates or API responses
 */
export function getCsrfToken(req: Request): string | undefined {
  return req.csrfToken;
}
