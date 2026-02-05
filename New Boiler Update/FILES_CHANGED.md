# Files Changed in This Update

## New Files Created

### Security
- `server/src/lib/logger.ts` - Pino structured logging
- `server/src/middleware/correlation.ts` - Request correlation IDs
- `server/src/middleware/csrf.ts` - CSRF protection middleware
- `packages/api/src/lib/logger.ts` - API package logger

### Database
- `packages/db/drizzle/0003_add_performance_indexes.sql` - Performance indexes
- `packages/db/drizzle/0004_add_account_lockout.sql` - Account lockout columns

### Docker/Production
- `Dockerfile` - Backend production build
- `apps/web/Dockerfile` - Frontend production build
- `apps/web/nginx.conf` - Nginx configuration
- `docker-compose.prod.yml` - Production stack
- `.dockerignore` - Docker build exclusions

### Tests
- `packages/api/src/routers/auth.test.ts` - Auth tests
- `packages/api/src/routers/quotes/crud.test.ts` - Quote system tests
- `packages/api/src/routers/sinks.test.ts` - Sink matching tests
- `packages/api/src/routers/user.test.ts` - User profile tests

### Accessibility
- `apps/web/src/components/SkipNavigation.tsx`
- `apps/web/src/components/ScreenReaderAnnouncement.tsx`
- `apps/web/src/components/accessibility/index.ts`
- `ACCESSIBILITY.md` - Implementation guide

### Quote Components (Refactored)
- `apps/web/src/components/quote/AddLineItemForm.tsx`
- `apps/web/src/components/quote/CustomerSelection.tsx`
- `apps/web/src/components/quote/LineItemsTable.tsx`
- `apps/web/src/components/quote/QuoteDetails.tsx`
- `apps/web/src/components/quote/QuoteSummary.tsx`
- `apps/web/src/components/quote/index.ts`

### Custom Hooks
- `apps/web/src/hooks/useLineItems.ts`
- `apps/web/src/hooks/useQuoteCalculations.ts`
- `apps/web/src/hooks/useQuoteForm.ts`
- `apps/web/src/hooks/index.ts`

---

## Modified Files

### Backend/API
- `server/src/index.ts` - Added logging, correlation middleware
- `packages/api/src/trpc.ts` - Added request logging
- `packages/api/src/services/email.ts` - Added logging
- `packages/api/src/services/workiz.ts` - Added logging
- `packages/api/src/routers/auth.ts` - Added account lockout
- `packages/api/src/routers/quotes/crud.ts` - Query optimization
- `packages/api/src/routers/quotes/line-items.ts` - Authorization fix
- `packages/api/src/routers/quotes/utils.ts` - Bug fix (negative totals)
- `packages/api/src/routers/user.ts` - Added profile endpoints

### Frontend
- `apps/web/src/main.tsx` - Added accessibility wrapper
- `apps/web/src/App.tsx` - Skip navigation integration
- `apps/web/src/index.css` - Screen reader utilities
- `apps/web/src/pages/LoginPage.tsx` - Form accessibility
- `apps/web/src/pages/DashboardPage.tsx` - Semantic landmarks
- `apps/web/src/pages/CustomersPage.tsx` - Search accessibility
- `apps/web/src/pages/NewQuotePage.tsx` - Refactored, accessibility
- `apps/web/src/pages/QuoteDetailPage.tsx` - Hidden Workiz buttons
- `apps/web/src/components/MeasurementForm.tsx` - Form accessibility
- `apps/web/src/components/ui/Button.tsx` - ARIA support
- `apps/web/src/components/ui/Input.tsx` - ARIA support
- `apps/web/src/components/ui/Select.tsx` - ARIA support

### Database
- `packages/db/src/schema/users.ts` - Added lockout columns

### Test Fixes
- `packages/api/src/routers/measurement.test.ts` - RBAC fix

### Config
- `packages/api/package.json` - Added pino dependency
- `server/package.json` - Added pino dependencies
- `pnpm-lock.yaml` - Updated dependencies

---

## Files by Category

### Total: 55 files

| Category | Count |
|----------|-------|
| New Files | 28 |
| Modified Files | 27 |
| Security | 6 |
| Infrastructure | 6 |
| Tests | 5 |
| Accessibility | 10 |
| Quote Refactor | 11 |
| API/Backend | 12 |
| Database | 3 |
| Config | 2 |
