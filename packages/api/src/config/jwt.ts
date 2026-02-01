/**
 * JWT Configuration
 *
 * This module validates and exports JWT secrets from environment variables.
 * It fails fast at startup if secrets are not configured properly.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// List of insecure placeholder values that must not be used in production
const INSECURE_PLACEHOLDERS = [
  'your-super-secret-jwt-key-change-in-production',
  'your-super-secret-refresh-key-change-in-production',
  'change-in-production',
  'change-me',
  'changeme',
  'secret',
  'password',
  'test',
];

/**
 * Validates that a secret is configured and not a placeholder value
 */
function validateSecret(secret: string | undefined, name: string): string {
  if (!secret) {
    throw new Error(
      `SECURITY ERROR: ${name} is not configured. ` +
      `Set the ${name} environment variable to a secure random value. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `SECURITY ERROR: ${name} is too short (${secret.length} characters). ` +
      `Secrets must be at least 32 characters long. ` +
      `Generate a secure secret with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  const lowerSecret = secret.toLowerCase();
  for (const placeholder of INSECURE_PLACEHOLDERS) {
    if (lowerSecret.includes(placeholder.toLowerCase())) {
      throw new Error(
        `SECURITY ERROR: ${name} contains an insecure placeholder value: "${placeholder}". ` +
        `Replace it with a secure random value. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
      );
    }
  }

  return secret;
}

// Validate secrets at module load time (fail fast)
export const jwtConfig = {
  secret: validateSecret(JWT_SECRET, 'JWT_SECRET'),
  refreshSecret: validateSecret(JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
  accessExpiry: (process.env.JWT_ACCESS_EXPIRY || '15m') as string,
  refreshExpiry: (process.env.JWT_REFRESH_EXPIRY || '7d') as string,
} as const;
