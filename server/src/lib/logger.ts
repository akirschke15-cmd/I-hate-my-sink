import pino from 'pino';
import { env } from '../env';

// Sensitive data masking patterns
const EMAIL_PATTERN = /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
const TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/gi;
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const PASSWORD_KEYS = ['password', 'secret', 'token', 'apiKey', 'api_key'];

/**
 * Masks email addresses: user@example.com -> u***@e***.com
 */
function maskEmail(email: string): string {
  return email.replace(EMAIL_PATTERN, (_match, local, domain) => {
    const maskedLocal = local.charAt(0) + '***';
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].charAt(0) + '***.' + domainParts.slice(1).join('.');
    return `${maskedLocal}@${maskedDomain}`;
  });
}

/**
 * Masks IP addresses: 192.168.1.100 -> 192.168.xxx.xxx
 */
function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip;
}

/**
 * Masks sensitive values in objects
 */
function maskSensitiveData(obj: unknown): unknown {
  if (typeof obj === 'string') {
    let result = maskEmail(obj);
    result = result.replace(TOKEN_PATTERN, 'Bearer [REDACTED]');
    result = result.replace(IP_PATTERN, (ip) => maskIp(ip));
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  if (obj && typeof obj === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (PASSWORD_KEYS.some((k) => key.toLowerCase().includes(k))) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return obj;
}

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'secret', 'token', 'apiKey', 'authorization'],
    censor: '[REDACTED]',
  },
};

// Development transport (pretty printing)
const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
};

// Create base logger
export const logger = pino(
  baseConfig,
  env.NODE_ENV !== 'production' ? pino.transport(devTransport) : undefined
);

// Category-specific loggers with child context
export const authLogger = logger.child({ category: 'auth' });
export const securityLogger = logger.child({ category: 'security' });
export const dbLogger = logger.child({ category: 'database' });
export const httpLogger = logger.child({ category: 'http' });
export const cronLogger = logger.child({ category: 'cron' });
export const emailLogger = logger.child({ category: 'email' });
export const redisLogger = logger.child({ category: 'redis' });

/**
 * Create a request-scoped logger with correlation ID
 */
export function createRequestLogger(correlationId: string) {
  return logger.child({ correlationId });
}

/**
 * Safely log data with automatic masking
 */
export function safeLog(data: unknown): unknown {
  return maskSensitiveData(data);
}

export { maskEmail, maskIp, maskSensitiveData };
