# Bug Postmortem: Login Authentication Failure

**Date**: February 5, 2026
**Severity**: Critical (P0)
**Status**: Resolved
**Duration**: ~2 hours (detection to resolution)

---

## Executive Summary

All user authentication was broken due to invalid bcrypt password hashes in the database. The root cause was test data insertion that used a literal string `"hash"` instead of a properly generated bcrypt hash. This prevented any user from logging in, regardless of their credentials.

---

## Incident Timeline

| Time | Event |
|------|-------|
| T-0 | User reports inability to login with valid credentials |
| T+15min | Investigation begins - credentials appear correct |
| T+30min | Database inspection reveals invalid password hash format |
| T+45min | Root cause identified: `password_hash = "hash"` (literal string) |
| T+60min | Cleanup scripts created to remove invalid data |
| T+90min | Database reseeded with valid demo users |
| T+120min | Resolution confirmed - all demo accounts functional |

---

## Impact Assessment

### Scope
- **Users Affected**: All users (100% impact)
- **Duration**: Until database was properly seeded
- **Services Affected**: Authentication system, all protected endpoints
- **Data Loss**: None
- **Business Impact**: Complete system unavailability for authenticated users

### Symptoms Observed
- All login attempts failed with "Invalid email or password"
- Account lockout triggered after multiple failed attempts
- Rate limiting activated due to repeated login failures
- No distinction between invalid credentials and system error

---

## Technical Analysis

### Root Cause

The database contained a user record with an invalid password hash:

```sql
-- INVALID DATA (actual state)
SELECT id, email, password_hash FROM users WHERE email = 'demo@example.com';
-- password_hash = "hash" (5 characters, plaintext string)

-- EXPECTED DATA (valid bcrypt hash)
-- password_hash = "$2a$12$abcd..." (60 characters, bcrypt format)
```

### Why It Failed

**Bcrypt Hash Structure:**
- Valid format: `$2a$12$[22-char-salt][31-char-hash]` (60 chars total)
- Algorithm identifier: `$2a$` or `$2b$`
- Cost factor: `$12$` (2^12 rounds)
- Salt: 22 characters (base64)
- Hash: 31 characters (base64)

**What Happened:**
```typescript
// Authentication code (packages/api/src/routers/auth.ts:151)
const isValid = await bcrypt.compare(input.password, user.passwordHash);
// bcrypt.compare("Password123", "hash") → false (silently fails)
// bcrypt.compare("anything", "hash") → false (always fails)
```

**Why bcrypt.compare() failed:**
- bcrypt expects a 60-character hash starting with `$2a$` or `$2b$`
- When given "hash", it cannot extract salt or validate format
- Returns `false` rather than throwing an error
- Authentication appears to work but always rejects valid passwords

### Code Flow That Masked the Issue

```typescript
// 1. User attempts login
POST /api/auth/login { email, password }

// 2. User lookup succeeds
const user = await db.query.users.findFirst(...); // ✅ User found

// 3. Account checks pass
if (!user.isActive) { ... }  // ✅ User is active
if (user.lockedUntil > now) { ... }  // ✅ Not locked initially

// 4. Password verification SILENTLY FAILS
const isValid = await bcrypt.compare(input.password, user.passwordHash);
// bcrypt.compare("Password123", "hash") → false ❌

// 5. Failed login handler triggers
failedLoginAttempts++; // Increments on every attempt
if (failedAttempts >= 5) { lockAccount(); } // Eventually locks account

// 6. Generic error returned (security best practice, but hides bug)
throw new TRPCError({ message: 'Invalid email or password' });
```

### Why This Wasn't Detected Earlier

1. **No format validation**: No check for valid bcrypt hash structure
2. **Silent failure**: bcrypt.compare() returns boolean, doesn't throw errors
3. **Security by design**: Generic error messages don't reveal system state
4. **Test data contamination**: Manual database insertion bypassed validation
5. **No health checks**: No automated verification of user data integrity

---

## Detection Process

### Investigation Steps

1. **Initial hypothesis**: User credentials incorrect
   - ❌ Ruled out: Demo credentials documented in `DEMO_CREDENTIALS.md`

2. **Second hypothesis**: Account locked or disabled
   - ❌ Ruled out: Database query showed `is_active = true`, no lockout

3. **Third hypothesis**: Rate limiting blocking requests
   - ⚠️ Confirmed but secondary: Rate limit triggered by repeated failures

4. **Fourth hypothesis**: Database connection issues
   - ❌ Ruled out: Other queries working, user lookup successful

5. **Fifth hypothesis**: Password hash validation issue
   - ✅ **ROOT CAUSE FOUND**: `password_hash = "hash"` (invalid format)

### Diagnostic Queries

```sql
-- Check user exists and is active
SELECT id, email, is_active, locked_until, failed_login_attempts
FROM users
WHERE email = 'demo@example.com';

-- Check password hash format
SELECT
  email,
  password_hash,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 4) as hash_prefix
FROM users;

-- Expected results for valid bcrypt hash:
-- hash_length: 60
-- hash_prefix: $2a$ or $2b$

-- Actual results (BAD DATA):
-- hash_length: 4
-- hash_prefix: hash
```

---

## Resolution Steps

### Immediate Fix

1. **Created cleanup scripts:**
   ```bash
   npx tsx scripts/check-bad-user-refs.ts    # Identify foreign key dependencies
   npx tsx scripts/cleanup-bad-data.ts       # Remove related data (quotes, line items)
   npx tsx scripts/cleanup-bad-users.ts      # Remove invalid user records
   ```

2. **Reseeded database with valid data:**
   ```bash
   npx tsx scripts/seed-demo-user.ts         # Create initial demo user
   npx tsx scripts/seed-demo-sinks.ts        # Add sink inventory
   npx tsx scripts/seed-demo-users-rbac.ts   # Create RBAC demo users
   ```

3. **Verified resolution:**
   ```bash
   npx tsx scripts/test-login.ts             # Test bcrypt validation
   npx tsx scripts/check-users.ts            # Verify all users have valid hashes
   ```

### Verification Results

```bash
# All users now have valid bcrypt hashes:
✅ admin@ihms.demo      - $2a$12$... (60 chars)
✅ sales1@ihms.demo     - $2a$12$... (60 chars)
✅ sales2@ihms.demo     - $2a$12$... (60 chars)
✅ demo@example.com     - $2a$12$... (60 chars)

# All login tests passing:
✅ bcrypt.compare("Admin123!", hash) → true
✅ bcrypt.compare("Sales123!", hash) → true
✅ bcrypt.compare("Password123", hash) → true
```

---

## Lessons Learned

### What Went Well ✅

- Clear error logging helped identify the symptom quickly
- Proper foreign key constraints prevented orphaned data
- Rate limiting and account lockout prevented brute force during testing
- Comprehensive seed scripts available for quick recovery
- Documentation (DEMO_CREDENTIALS.md) provided known-good test cases

### What Went Wrong ❌

- No validation to ensure password hashes are properly formatted
- Test data inserted directly into database bypassed application logic
- No automated health checks to detect invalid user data
- Silent failure of bcrypt.compare() masked the underlying issue
- Generic error messages (though secure) made diagnosis harder

### Action Items

1. **Add password hash validation** [Priority: High]
   - Validate hash format before storing in database
   - Add database constraint to check hash length and prefix
   - Create migration to audit existing password hashes

2. **Improve observability** [Priority: High]
   - Add structured logging for authentication failures
   - Distinguish between invalid credentials vs. system errors
   - Create alerts for abnormal authentication failure patterns

3. **Database integrity checks** [Priority: Medium]
   - Add health check endpoint that validates critical data
   - Create scheduled job to audit user data integrity
   - Document SQL queries for manual verification

4. **Development practices** [Priority: Medium]
   - Always use seed scripts rather than manual SQL inserts
   - Add pre-commit hooks to validate seed data
   - Document safe user creation patterns

5. **Testing improvements** [Priority: Low]
   - Add integration tests that verify full login flow
   - Test with intentionally malformed data
   - Create test fixtures with edge cases

---

## Related Documentation

- [DATABASE_INTEGRITY_GUIDELINES.md](./DATABASE_INTEGRITY_GUIDELINES.md) - Prevention guidelines
- [LOGIN_FIX_SUMMARY.md](../LOGIN_FIX_SUMMARY.md) - Quick fix summary
- [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md) - Valid demo account credentials

---

## Sign-off

**Incident Commander**: System Administrator
**Resolution Confirmed By**: Development Team
**Postmortem Completed**: February 5, 2026
**Status**: Closed - Resolution successful, prevention measures documented
