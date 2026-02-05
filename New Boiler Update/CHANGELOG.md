# IHMS Boiler Update - Change Log

**Date**: February 5, 2026
**Commits**: 4fa2c2a, 32779ae
**Total Changes**: 55 files modified, 6,007 insertions, 719 deletions

---

## Summary of Changes

This update includes major improvements across security, testing, infrastructure, accessibility, and code quality.

---

## 1. Security Hardening

### Account Lockout System
- **File**: `packages/api/src/routers/auth.ts`
- Accounts lock after 5 failed login attempts
- 15-minute lockout duration
- Database tracking via new columns in users table

### CSRF Protection
- **File**: `server/src/middleware/csrf.ts`
- Double Submit Cookie pattern implementation
- Configurable for development/production environments
- Protects all state-changing operations

### Database Migration
- **File**: `packages/db/drizzle/0004_add_account_lockout.sql`
- Added `failed_login_attempts` column
- Added `locked_until` column

---

## 2. Structured Logging

### Pino Logger Implementation
- **File**: `server/src/lib/logger.ts`
- **File**: `packages/api/src/lib/logger.ts`
- Sensitive data masking (emails, IPs, tokens, passwords)
- Category-specific child loggers:
  - `authLogger` - Authentication events
  - `securityLogger` - Security events
  - `dbLogger` - Database operations
  - `httpLogger` - HTTP requests
  - `cronLogger` - Scheduled tasks
  - `emailLogger` - Email operations
  - `redisLogger` - Redis operations

### Correlation IDs
- **File**: `server/src/middleware/correlation.ts`
- Unique ID per request for distributed tracing
- Passed through `X-Correlation-ID` header
- Available in all log entries

---

## 3. Database Performance

### New Indexes
- **File**: `packages/db/drizzle/0003_add_performance_indexes.sql`
- 142 lines of index definitions
- Optimized queries for:
  - Customer lookups by company
  - Quote searches by status/date
  - Measurement queries
  - User authentication

---

## 4. Production Infrastructure

### Docker Configuration
- **File**: `Dockerfile` (83 lines) - Multi-stage backend build
- **File**: `apps/web/Dockerfile` (68 lines) - Multi-stage frontend build
- **File**: `apps/web/nginx.conf` (116 lines) - Optimized nginx config
- **File**: `docker-compose.prod.yml` (158 lines) - Full production stack
- **File**: `.dockerignore` (52 lines) - Build optimization

### Production Stack Includes:
- PostgreSQL with persistent volumes
- Redis for rate limiting and caching
- Nginx reverse proxy
- Health checks on all services

---

## 5. Test Coverage

### New Test Files (2,793 lines total)
- **File**: `packages/api/src/routers/auth.test.ts` (187 lines)
  - Login success/failure scenarios
  - Account lockout verification
  - Token refresh testing

- **File**: `packages/api/src/routers/quotes/crud.test.ts` (1,298 lines)
  - Quote CRUD operations
  - Line item management
  - Discount calculations
  - Status transitions
  - RBAC authorization

- **File**: `packages/api/src/routers/sinks.test.ts` (1,039 lines)
  - Sink matching algorithms
  - Dimension calculations
  - Material/style filtering
  - Edge cases

- **File**: `packages/api/src/routers/user.test.ts` (269 lines)
  - User profile operations
  - Password changes
  - Preferences management

### Bug Fix Discovered
- **File**: `packages/api/src/routers/quotes/utils.ts`
- Fixed negative quote totals when discount exceeds subtotal
- `taxableAmount` now clamped to minimum of 0

---

## 6. WCAG 2.1 AA Accessibility

### New Components
- **File**: `apps/web/src/components/SkipNavigation.tsx`
  - Skip to main content link
  - Visible on keyboard focus

- **File**: `apps/web/src/components/ScreenReaderAnnouncement.tsx`
  - Dynamic announcements for screen readers
  - Configurable politeness (polite/assertive)
  - Hook-based API for programmatic use

### Page Updates
All major pages updated with:
- Semantic landmarks (`<main>`, `<nav>`, `<aside>`)
- ARIA labels on interactive elements
- Proper heading hierarchy
- Form field associations
- Error announcements with `role="alert"`

### Updated Pages:
- `LoginPage.tsx` - Form accessibility, error announcements
- `DashboardPage.tsx` - Landmarks, navigation, stats sections
- `CustomersPage.tsx` - Search accessibility, list navigation
- `NewQuotePage.tsx` - Complete form accessibility

### Documentation
- **File**: `ACCESSIBILITY.md` (546 lines)
  - Complete WCAG 2.1 AA implementation guide
  - Testing guidelines with NVDA, VoiceOver, JAWS
  - Code examples for all patterns
  - Maintenance checklist

---

## 7. Code Refactoring

### NewQuotePage Modularization
Extracted from monolithic component into:
- `components/quote/CustomerSelection.tsx`
- `components/quote/LineItemsTable.tsx`
- `components/quote/AddLineItemForm.tsx`
- `components/quote/QuoteDetails.tsx`
- `components/quote/QuoteSummary.tsx`

### Custom Hooks
- `hooks/useQuoteForm.ts` - Form state management
- `hooks/useLineItems.ts` - Line item CRUD operations
- `hooks/useQuoteCalculations.ts` - Totals computation

### Result
- Reduced `NewQuotePage.tsx` from ~900 lines to ~300 lines
- Improved testability
- Better separation of concerns

---

## 8. UI Modifications

### Hidden Workiz Integration
- **File**: `apps/web/src/pages/QuoteDetailPage.tsx`
- Workiz buttons commented out (future enhancement)
- "Create Workiz Job" and "View in Workiz" hidden

---

## Files Changed Summary

| Category | Files | Lines Added | Lines Removed |
|----------|-------|-------------|---------------|
| Security | 4 | ~450 | ~50 |
| Logging | 3 | ~200 | ~10 |
| Database | 2 | ~175 | 0 |
| Docker | 5 | ~475 | 0 |
| Tests | 4 | ~2,800 | ~50 |
| Accessibility | 8 | ~800 | ~100 |
| Refactoring | 9 | ~700 | ~500 |
| Documentation | 1 | ~550 | 0 |

---

## Running Tests

All 144 tests pass:

```bash
pnpm test
```

---

## Migration Notes

1. Run database migrations:
   ```bash
   pnpm db:push
   ```

2. Environment variables for new features:
   - `CSRF_SECRET` - For CSRF protection (auto-generated if not set)
   - Logging is automatic, no config needed

3. Docker production deployment:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
