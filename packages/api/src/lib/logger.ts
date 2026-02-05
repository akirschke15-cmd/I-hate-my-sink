import pino from 'pino';

// Base logger configuration for API package
// In production, this will be configured from server's environment
const isDev = process.env.NODE_ENV !== 'production';

const baseConfig: pino.LoggerOptions = {
  level: isDev ? 'debug' : 'info',
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
export const logger = pino(baseConfig, isDev ? pino.transport(devTransport) : undefined);

// Category-specific loggers for API operations
export const authLogger = logger.child({ category: 'auth' });
export const securityLogger = logger.child({ category: 'security' });
export const dbLogger = logger.child({ category: 'database' });
export const emailLogger = logger.child({ category: 'email' });
export const workizLogger = logger.child({ category: 'workiz' });
export const quoteLogger = logger.child({ category: 'quote' });
