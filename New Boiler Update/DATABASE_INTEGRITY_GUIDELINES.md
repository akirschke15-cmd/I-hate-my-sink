# Database Integrity Guidelines

## Purpose

This document establishes best practices for maintaining data integrity in the IHMS database, with specific focus on authentication data and prevention of incidents like the February 2026 login failure.

---

## Table of Contents

1. [Password Hash Validation Rules](#password-hash-validation-rules)
2. [Data Seeding Best Practices](#data-seeding-best-practices)
3. [User Data Integrity Verification](#user-data-integrity-verification)
4. [SQL Queries for Data Validation](#sql-queries-for-data-validation)
5. [Prevention Checklist](#prevention-checklist)
6. [Safe User Creation Patterns](#safe-user-creation-patterns)
7. [Database Health Checks](#database-health-checks)
8. [Emergency Response Procedures](#emergency-response-procedures)

---

## Password Hash Validation Rules

### Valid Bcrypt Hash Format

A valid bcrypt hash MUST conform to this structure:

```
Format: $2[a|b]$[cost]$[22-char salt][31-char hash]
Example: $2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW
         └─┘ └─┘ └──────────────────┘└────────────────────────────────┘
         │   │   │                    │
         │   │   │                    └─ 31-char hash (base64)
         │   │   └───────────────────── 22-char salt (base64)
         │   └────────────────────────── Cost factor (2^12 rounds)
         └────────────────────────────── Algorithm ($2a$ or $2b$)
```

### Validation Requirements

| Property | Rule | Example |
|----------|------|---------|
| **Length** | Exactly 60 characters | `$2a$12$...` (60 chars) |
| **Prefix** | Must start with `$2a$` or `$2b$` | ✅ `$2a$12$...` ❌ `$2c$` |
| **Cost Factor** | Must be between `$04$` and `$31$` | Recommended: `$12$` |
| **Character Set** | Base64: `[A-Za-z0-9./]` | No special chars |

### TypeScript Validation Function

```typescript
/**
 * Validates bcrypt hash format
 * @param hash - The hash to validate
 * @returns true if valid, false otherwise
 */
export function isValidBcryptHash(hash: string): boolean {
  // Check length (60 characters)
  if (hash.length !== 60) {
    return false;
  }

  // Check format: $2[a|b]$[cost]$[salt+hash]
  const bcryptRegex = /^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$/;
  if (!bcryptRegex.test(hash)) {
    return false;
  }

  // Extract and validate cost factor (04-31)
  const costMatch = hash.match(/^\$2[ab]\$(\d{2})\$/);
  if (!costMatch) {
    return false;
  }

  const cost = parseInt(costMatch[1], 10);
  if (cost < 4 || cost > 31) {
    return false;
  }

  return true;
}

/**
 * Type guard for bcrypt hash validation
 */
export function assertValidBcryptHash(
  hash: string,
  context: string = 'password_hash'
): asserts hash is string {
  if (!isValidBcryptHash(hash)) {
    throw new Error(
      `Invalid bcrypt hash for ${context}: expected 60-char string starting with $2a$ or $2b$, got ${hash.length} chars starting with "${hash.substring(0, 10)}"`
    );
  }
}
```

### SQL Validation Constraint

Add this constraint to the `users` table:

```sql
-- Add constraint to users table
ALTER TABLE users
ADD CONSTRAINT valid_password_hash
CHECK (
  password_hash ~ '^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$'
  AND LENGTH(password_hash) = 60
);

-- Test constraint (should fail)
INSERT INTO users (email, password_hash, ...)
VALUES ('test@example.com', 'hash', ...);
-- ERROR: new row for relation "users" violates check constraint "valid_password_hash"

-- Test constraint (should succeed)
INSERT INTO users (email, password_hash, ...)
VALUES ('test@example.com', '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', ...);
```

---

## Data Seeding Best Practices

### ✅ DO: Use Application Code for Seeding

Always use TypeScript seed scripts that leverage the application's password hashing logic:

```typescript
// ✅ CORRECT: scripts/seed-demo-user.ts
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const sql = postgres(DATABASE_URL);

async function seedDemoData() {
  // Hash password using bcrypt (12 rounds)
  const passwordHash = await bcrypt.hash('Password123', 12);

  // Insert with validated hash
  const result = await sql`
    INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
    VALUES (
      ${companyId},
      ${email},
      ${passwordHash},  -- Valid bcrypt hash
      ${firstName},
      ${lastName},
      ${role}
    )
    RETURNING id, email
  `;

  console.log('User created:', result[0]);
}
```

### ❌ DON'T: Manual SQL Inserts with Placeholder Values

Never insert users directly via SQL with placeholder values:

```sql
-- ❌ WRONG: Direct SQL insert with placeholder
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('demo@example.com', 'hash', 'Demo', 'User');
-- This will fail authentication!

-- ❌ WRONG: NULL password hash
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('demo@example.com', NULL, 'Demo', 'User');
-- This will cause runtime errors!

-- ❌ WRONG: Empty string
INSERT INTO users (email, password_hash, first_name, last_name)
VALUES ('demo@example.com', '', 'Demo', 'User');
-- This will fail validation!
```

### Pre-Commit Hook for Seed Scripts

Add validation to seed scripts before they execute:

```typescript
// Add to all seed scripts
async function validatePasswordHash(hash: string): Promise<void> {
  if (!isValidBcryptHash(hash)) {
    throw new Error(
      `SEED VALIDATION FAILED: Invalid bcrypt hash generated.\n` +
      `Expected: 60-char string starting with $2a$ or $2b$\n` +
      `Got: ${hash.length}-char string starting with "${hash.substring(0, 10)}"`
    );
  }

  console.log('✅ Password hash validation passed');
}

async function seedDemoData() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  // Validate before inserting
  await validatePasswordHash(passwordHash);

  const result = await sql`INSERT INTO users ...`;
}
```

---

## User Data Integrity Verification

### Manual Verification Query

Run this query to audit all user password hashes:

```sql
-- Check all user password hashes for integrity
SELECT
  id,
  email,
  role,
  is_active,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 4) as hash_prefix,
  CASE
    WHEN LENGTH(password_hash) != 60 THEN '❌ Invalid length'
    WHEN password_hash !~ '^\$2[ab]\$' THEN '❌ Invalid prefix'
    WHEN password_hash !~ '^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$' THEN '❌ Invalid format'
    ELSE '✅ Valid'
  END as validation_status
FROM users
ORDER BY validation_status DESC, email;
```

Expected output for healthy database:

```
 id | email              | role        | is_active | hash_length | hash_prefix | validation_status
----+--------------------+-------------+-----------+-------------+-------------+-------------------
 1  | admin@ihms.demo    | admin       | t         | 60          | $2a$        | ✅ Valid
 2  | sales1@ihms.demo   | salesperson | t         | 60          | $2a$        | ✅ Valid
 3  | sales2@ihms.demo   | salesperson | t         | 60          | $2a$        | ✅ Valid
```

### Automated Health Check Script

Create `scripts/verify-user-integrity.ts`:

```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

interface UserIntegrityCheck {
  id: string;
  email: string;
  hashLength: number;
  hashPrefix: string;
  isValid: boolean;
}

async function verifyUserIntegrity(): Promise<void> {
  console.log('🔍 Checking user data integrity...\n');

  const users = await sql<UserIntegrityCheck[]>`
    SELECT
      id,
      email,
      LENGTH(password_hash) as hash_length,
      SUBSTRING(password_hash, 1, 4) as hash_prefix,
      (
        LENGTH(password_hash) = 60 AND
        password_hash ~ '^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$'
      ) as is_valid
    FROM users
  `;

  let validCount = 0;
  let invalidCount = 0;

  users.forEach((user) => {
    if (user.isValid) {
      console.log(`✅ ${user.email} - Valid hash`);
      validCount++;
    } else {
      console.error(
        `❌ ${user.email} - INVALID HASH\n` +
        `   Length: ${user.hashLength} (expected 60)\n` +
        `   Prefix: ${user.hashPrefix} (expected $2a$ or $2b$)`
      );
      invalidCount++;
    }
  });

  console.log(`\n📊 Summary: ${validCount} valid, ${invalidCount} invalid`);

  if (invalidCount > 0) {
    console.error('\n🚨 CRITICAL: Invalid password hashes detected!');
    console.error('   Run: npx tsx scripts/cleanup-bad-users.ts');
    process.exit(1);
  }

  console.log('✅ All user password hashes are valid\n');
  await sql.end();
}

verifyUserIntegrity();
```

Run regularly:

```bash
# Manual check
npx tsx scripts/verify-user-integrity.ts

# Add to CI/CD pipeline
# Add to pre-deployment health checks
# Schedule daily in production monitoring
```

---

## SQL Queries for Data Validation

### Detect Invalid Password Hashes

```sql
-- Find users with invalid password hashes
SELECT
  id,
  email,
  password_hash,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 10) as hash_sample
FROM users
WHERE
  LENGTH(password_hash) != 60
  OR password_hash !~ '^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$';

-- Should return 0 rows in healthy database
```

### Detect Inactive or Locked Accounts

```sql
-- Find problematic user accounts
SELECT
  id,
  email,
  role,
  is_active,
  failed_login_attempts,
  last_failed_login_at,
  locked_until,
  CASE
    WHEN NOT is_active THEN '⚠️ Inactive'
    WHEN locked_until > NOW() THEN '🔒 Locked'
    WHEN failed_login_attempts >= 3 THEN '⚠️ Multiple failed attempts'
    ELSE '✅ OK'
  END as status
FROM users
WHERE
  NOT is_active
  OR locked_until > NOW()
  OR failed_login_attempts >= 3
ORDER BY status, email;
```

### Find Orphaned Data

```sql
-- Find quotes without valid users
SELECT q.id, q.customer_id, q.created_by
FROM quotes q
LEFT JOIN users u ON q.created_by = u.id
WHERE u.id IS NULL;

-- Find customers without valid company
SELECT c.id, c.name, c.company_id
FROM customers c
LEFT JOIN companies co ON c.company_id = co.id
WHERE co.id IS NULL;
```

---

## Prevention Checklist

### Before Creating Users

- [ ] Use seed scripts (not manual SQL)
- [ ] Verify bcrypt is installed and imported
- [ ] Set cost factor to 12 (or higher)
- [ ] Validate hash format before insertion
- [ ] Test login immediately after creation

### Before Deploying

- [ ] Run user integrity verification script
- [ ] Check for NULL or empty password hashes
- [ ] Verify all foreign key relationships
- [ ] Test authentication with demo accounts
- [ ] Review recent database migrations

### During Development

- [ ] Never commit test data with placeholder passwords
- [ ] Use environment variables for sensitive data
- [ ] Document all seed scripts in README
- [ ] Add validation to database constraints
- [ ] Write integration tests for authentication

### In Production

- [ ] Schedule daily integrity checks
- [ ] Monitor authentication failure rates
- [ ] Alert on abnormal failed login patterns
- [ ] Regular backups before schema changes
- [ ] Audit log for direct database modifications

---

## Safe User Creation Patterns

### Pattern 1: Seed Script (Recommended)

```typescript
// scripts/create-user.ts
import bcrypt from 'bcryptjs';
import { db } from '@ihms/db';
import { users } from '@ihms/db/schema';
import { isValidBcryptHash } from './utils/validation';

async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'admin' | 'salesperson',
  companyId: string
) {
  // 1. Hash password with bcrypt (12 rounds minimum)
  const passwordHash = await bcrypt.hash(password, 12);

  // 2. Validate hash format
  if (!isValidBcryptHash(passwordHash)) {
    throw new Error('Generated password hash is invalid');
  }

  // 3. Insert user
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role,
      companyId,
      isActive: true,
    })
    .returning();

  // 4. Verify login works
  const loginWorks = await bcrypt.compare(password, newUser.passwordHash);
  if (!loginWorks) {
    throw new Error('Password verification failed after user creation');
  }

  console.log('✅ User created and verified:', newUser.email);
  return newUser;
}
```

### Pattern 2: API Endpoint with Validation

```typescript
// packages/api/src/routers/auth.ts
export const authRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    // 1. Validate input
    const { email, password, firstName, lastName, companyId } = input;

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. CRITICAL: Validate hash before storing
    assertValidBcryptHash(passwordHash, `registration for ${email}`);

    // 4. Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        companyId,
        role: 'salesperson',
      })
      .returning();

    // 5. Generate tokens (implicit login test)
    const accessToken = signAccessToken({ userId: newUser.id, ... });

    return { accessToken, user: newUser };
  }),
});
```

### Pattern 3: Database Migration with Users

```typescript
// migrations/001_create_initial_users.ts
import bcrypt from 'bcryptjs';

export async function up(db) {
  // Create users table
  await db.schema.createTable('users', ...);

  // Insert admin user with validated hash
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 12);

  if (!isValidBcryptHash(adminPasswordHash)) {
    throw new Error('Migration failed: Invalid admin password hash');
  }

  await db.insert('users').values({
    email: 'admin@ihms.demo',
    password_hash: adminPasswordHash,
    role: 'admin',
    is_active: true,
  });

  console.log('✅ Admin user created with valid hash');
}
```

---

## Database Health Checks

### Health Check Endpoint

```typescript
// server/src/routes/health.ts
import { Router } from 'express';
import { db } from '@ihms/db';

const router = Router();

router.get('/health/database', async (req, res) => {
  try {
    // 1. Check database connection
    await db.execute('SELECT 1');

    // 2. Verify user password hash integrity
    const invalidHashes = await db.query.users.findMany({
      where: sql`
        LENGTH(password_hash) != 60
        OR password_hash !~ '^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$'
      `,
    });

    if (invalidHashes.length > 0) {
      return res.status(500).json({
        status: 'unhealthy',
        message: 'Invalid password hashes detected',
        details: {
          invalidUserCount: invalidHashes.length,
        },
      });
    }

    // 3. Check for locked accounts
    const lockedAccounts = await db.query.users.findMany({
      where: sql`locked_until > NOW()`,
    });

    res.json({
      status: 'healthy',
      checks: {
        databaseConnection: 'ok',
        userPasswordHashes: 'valid',
        lockedAccounts: lockedAccounts.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
```

### Monitoring Script

```bash
#!/bin/bash
# scripts/monitor-database-health.sh

# Run health checks
echo "🔍 Running database health checks..."

# 1. Check password hash integrity
npx tsx scripts/verify-user-integrity.ts

# 2. Check for orphaned data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM quotes WHERE created_by NOT IN (SELECT id FROM users);"

# 3. Check for inactive companies
psql $DATABASE_URL -c "SELECT COUNT(*) FROM companies WHERE NOT is_active;"

echo "✅ Health check complete"
```

---

## Emergency Response Procedures

### If Invalid Hashes Are Detected

1. **Identify scope:**
   ```sql
   SELECT id, email, role FROM users WHERE LENGTH(password_hash) != 60;
   ```

2. **Notify affected users** (if in production)

3. **Reset passwords** or **delete test accounts:**
   ```bash
   npx tsx scripts/cleanup-bad-users.ts
   npx tsx scripts/seed-demo-users-rbac.ts
   ```

4. **Verify fix:**
   ```bash
   npx tsx scripts/verify-user-integrity.ts
   npx tsx scripts/test-login.ts
   ```

### If Authentication Is Broken

1. **Check backend is running:**
   ```bash
   curl http://localhost:3011/health
   ```

2. **Verify database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

3. **Check user data:**
   ```bash
   npx tsx scripts/check-users.ts
   ```

4. **Test bcrypt validation:**
   ```bash
   npx tsx scripts/test-login.ts
   ```

5. **Review logs:**
   ```bash
   tail -f server/logs/error.log
   ```

### Contact Information

- **Database Admin**: [contact info]
- **Backend Team**: [contact info]
- **On-Call Engineer**: [contact info]

---

## Related Documentation

- [BUG_POSTMORTEM_LOGIN_FAILURE.md](./BUG_POSTMORTEM_LOGIN_FAILURE.md) - February 2026 incident details
- [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md) - Valid demo account credentials
- [API_CONSISTENCY_GUIDELINES.md](./API_CONSISTENCY_GUIDELINES.md) - API design patterns

---

**Document Version**: 1.0
**Last Updated**: February 5, 2026
**Maintained By**: Development Team
