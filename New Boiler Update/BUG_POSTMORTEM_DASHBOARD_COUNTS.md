# Bug Postmortem: Dashboard Count Mismatch

## Incident Summary

**Date:** 2026-02-05
**Severity:** Medium
**Duration:** Unknown (discovered during testing)
**Impact:** Dashboard displayed incorrect counts (5 customers and 0 quotes instead of 200 each)
**Status:** Resolved

## Executive Summary

The dashboard displayed incorrect entity counts due to inconsistent API response formats. The `customer.list` API returned a flat array (showing only paginated results), while `quote.list` returned an object with `items`, `total`, and `hasMore` properties. The frontend incorrectly used `.length` on the customer response (getting page size of 5) while correctly using `.total` on the quote response (getting 0 because the structure didn't exist initially).

## Timeline

| Time | Event |
|------|-------|
| Unknown | Bug introduced when `customer.list` API implemented with flat array response |
| Unknown | `quote.list` API correctly implemented with paginated response format |
| 2026-02-05 | Bug discovered during testing |
| 2026-02-05 | Root cause identified: API format inconsistency |
| 2026-02-05 | Fix implemented and tested |
| 2026-02-05 | Documentation created to prevent recurrence |

## What Happened

### The Problem

The dashboard showed:
- **Customers:** 5 (should be 200+)
- **Quotes:** 0 (should be 200+)

### The Root Cause

Two separate issues combined to create the bug:

#### Issue 1: Inconsistent API Response Formats

**customer.list (WRONG):**
```typescript
.query(async ({ ctx, input }) => {
  const results = await db.query.customers.findMany({
    where: whereClause,
    limit: input.limit, // Default: 5
    offset: input.offset,
  });

  return results; // Flat array [customer1, customer2, ...]
});
```

**quote.list (CORRECT):**
```typescript
.query(async ({ ctx, input }) => {
  const results = await db.query.quotes.findMany({
    where: whereClause,
    limit: input.limit,
    offset: input.offset,
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(whereClause);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    items: results,
    total,
    hasMore: input.offset + results.length < total,
  };
});
```

#### Issue 2: Frontend Assumed Consistent Format

**DashboardPage.tsx:**
```typescript
const { data: customers } = trpc.customer.list.useQuery({ limit: 5 });
const { data: quotes } = trpc.quote.list.useQuery({ limit: 5 });

const customerCount = customers?.length;  // Got 5 (page size)
const quoteCount = quotes?.total || 0;    // Got undefined, defaulted to 0
```

The frontend code assumed both APIs would return the same format, but they didn't.

## Impact Analysis

### User Impact
- **Low to Medium:** Dashboard metrics were misleading
- Users might have thought they had fewer customers than they actually did
- Could lead to incorrect business decisions based on displayed metrics

### Data Impact
- **None:** No data was corrupted or lost
- Issue was display-only

### System Impact
- **None:** System functionality was not affected
- Backend data was correct, only frontend display was wrong

## Resolution

### The Fix

#### Step 1: Standardize customer.list API

Updated `packages/api/src/routers/customer.ts`:

```typescript
.query(async ({ ctx, input }) => {
  // ... existing query logic ...

  const results = await db.query.customers.findMany({
    where: whereClause,
    limit: input.limit,
    offset: input.offset,
    orderBy: [desc(customers.createdAt)],
  });

  // Add total count query
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(whereClause);

  const total = Number(countResult[0]?.count ?? 0);

  // Return standardized format
  return {
    items: results.map((customer) => ({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })),
    total,
    hasMore: input.offset + results.length < total,
  };
}),
```

#### Step 2: Update DashboardPage.tsx

```typescript
const { data: customers } = trpc.customer.list.useQuery({ limit: 5 });
const { data: quotes } = trpc.quote.list.useQuery({ limit: 5 });

const customerCount = customers?.total || 0;  // Now correct
const quoteCount = quotes?.total || 0;        // Already correct
```

#### Step 3: Update Other Frontend Pages

Updated pages that consumed `customer.list`:
- `CustomersPage.tsx`: Changed `customers.map(...)` to `customers?.items?.map(...)`
- `NewQuotePage.tsx`: Changed customer list handling to use `.items`

### Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/api/src/routers/customer.ts` | Modified | Added total count query and standardized response format |
| `apps/web/src/pages/DashboardPage.tsx` | Modified | Changed `customers?.length` to `customers?.total` |
| `apps/web/src/pages/CustomersPage.tsx` | Modified | Updated to use `customers?.items` for array access |
| `apps/web/src/pages/NewQuotePage.tsx` | Modified | Updated to use `customers?.items` for dropdown |

### Testing Performed

- [x] Dashboard displays correct customer count (200+)
- [x] Dashboard displays correct quote count (200+)
- [x] Customers page still loads and displays customers
- [x] New Quote page customer dropdown still works
- [x] Pagination still functions correctly
- [x] Search still functions correctly

## Root Cause Analysis

### Why It Happened

1. **No API response format standards:** Developers implemented endpoints without a standard format guideline
2. **Lack of TypeScript typing:** Response types weren't enforced at the API boundary
3. **No code review checklist:** The inconsistency wasn't caught during review
4. **Frontend assumed consistency:** Frontend code was written assuming all APIs would be similar

### Contributing Factors

1. **Incremental development:** APIs were built at different times by potentially different developers
2. **No integration tests:** No tests verified dashboard counts matched actual data
3. **Missing documentation:** No documented standard for list endpoint responses

## Lessons Learned

### What Went Well

1. Bug was caught during testing before production deployment
2. Fix was straightforward once root cause identified
3. No data corruption or system downtime

### What Went Wrong

1. Inconsistent API design slipped through code review
2. Frontend made unsafe assumptions about API structure
3. No automated tests to catch the discrepancy

### Where We Got Lucky

1. Bug was in non-critical dashboard metrics
2. Actual application functionality (CRUD operations) still worked
3. No customer-facing impact

## Action Items

### Immediate (Completed)

- [x] Fix `customer.list` API response format
- [x] Update all frontend components consuming customer.list
- [x] Test all affected pages
- [x] Create API consistency guidelines document

### Short Term (Next Sprint)

- [ ] Create TypeScript interface for `PaginatedResponse<T>`
- [ ] Add interface to all list endpoint return types
- [ ] Create integration tests for dashboard metrics
- [ ] Add linting rule to catch `.length` on API responses
- [ ] Update code review checklist with API format verification

### Long Term (Next Quarter)

- [ ] Audit all existing API endpoints for consistency
- [ ] Create API design guide for new endpoints
- [ ] Implement automated API contract testing
- [ ] Add TypeScript strict mode to catch type mismatches earlier
- [ ] Create shared API response types package

## Prevention Measures

### Technical Controls

1. **Standardized response format:** All list endpoints must return `{ items, total, hasMore }`
2. **TypeScript interfaces:** Use shared `PaginatedResponse<T>` type
3. **Linting rules:** Warn on direct `.length` access on API responses
4. **Integration tests:** Test that dashboard counts match database counts

### Process Controls

1. **Code review checklist:** Verify API response format consistency
2. **API design guide:** Document standard patterns before implementation
3. **Type checking:** Enable strict TypeScript mode in CI/CD
4. **Testing requirements:** Require integration tests for new APIs

### Documentation

1. **API Consistency Guidelines:** [API_CONSISTENCY_GUIDELINES.md](./API_CONSISTENCY_GUIDELINES.md)
2. **Code review checklist:** Updated with API format verification
3. **Architecture decision record:** Document standardized response format

## Related Incidents

None (this is the first documented instance)

## Appendix

### Technical Details

#### Database Query Performance

The fix added a COUNT query to `customer.list`. Performance impact:

```sql
-- Original (no count)
SELECT * FROM customers WHERE company_id = ? LIMIT 5;

-- Updated (with count)
SELECT * FROM customers WHERE company_id = ? LIMIT 5;
SELECT COUNT(*) FROM customers WHERE company_id = ?;
```

**Impact:** Minimal (< 1ms additional query time on indexed column)

#### Alternative Solutions Considered

1. **Frontend-only fix:** Just change frontend to handle both formats
   - **Rejected:** Doesn't solve root cause, technical debt accumulates

2. **GraphQL migration:** Move to GraphQL with schema enforcement
   - **Rejected:** Too large a change for this issue, consider for future

3. **API versioning:** Create v2 endpoints with correct format
   - **Rejected:** Adds complexity, prefer fixing in place

### Reference Links

- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [REST API Best Practices](https://restfulapi.net/rest-api-design-tutorial-with-example/)

### Code Snippets

See [API_CONSISTENCY_GUIDELINES.md](./API_CONSISTENCY_GUIDELINES.md) for complete code examples.

---

**Prepared by:** Engineering Team
**Reviewed by:** Technical Lead
**Date:** 2026-02-05
**Next Review:** 2026-03-05 (verify action items completed)
