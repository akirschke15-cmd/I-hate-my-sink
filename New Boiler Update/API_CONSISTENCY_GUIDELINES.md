# API Consistency Guidelines

## Overview

This document establishes standards for API response formats across the IHMS application to ensure consistency, prevent bugs, and improve developer experience.

## Standard Response Formats

### List Endpoints

All list endpoints MUST return a consistent paginated response format:

```typescript
{
  items: T[];      // Array of items for the current page
  total: number;   // Total count of items across all pages
  hasMore: boolean; // Whether more pages exist after this one
}
```

#### TypeScript Interface

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
```

### Example Implementation

#### Backend (tRPC Router)

```typescript
list: protectedProcedure
  .input(
    z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const conditions = [eq(table.companyId, ctx.user.companyId)];

    if (input.search) {
      // Add search conditions
    }

    const whereClause = and(...conditions);

    // Fetch paginated results
    const results = await db.query.table.findMany({
      where: whereClause,
      limit: input.limit,
      offset: input.offset,
      orderBy: [desc(table.createdAt)],
    });

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    // Return standardized format
    return {
      items: results,
      total,
      hasMore: input.offset + results.length < total,
    };
  }),
```

#### Frontend (React Component)

```typescript
function ListPage() {
  const { data, isLoading, isError } = trpc.resource.list.useQuery({
    limit: 50,
    offset: 0,
  });

  // Access total count
  const totalCount = data?.total || 0;

  // Access items
  const items = data?.items || [];

  // Check if more pages available
  const hasMore = data?.hasMore || false;

  return (
    <div>
      <h1>Total: {totalCount}</h1>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      {hasMore && <button>Load More</button>}
    </div>
  );
}
```

## Common Pitfalls

### Pitfall 1: Returning Raw Arrays

**DON'T:**
```typescript
// Backend
return results; // Just an array

// Frontend
const count = data?.length; // This is PAGE SIZE, not total count
```

**DO:**
```typescript
// Backend
return {
  items: results,
  total: totalCount,
  hasMore: offset + results.length < totalCount,
};

// Frontend
const count = data?.total; // Correct total count
```

### Pitfall 2: Inconsistent Response Formats

**DON'T:**
```typescript
// customer.list returns array
return results;

// quote.list returns object
return { items, total, hasMore };
```

**DO:**
```typescript
// ALL list endpoints return the same format
return { items, total, hasMore };
```

### Pitfall 3: Using `.length` on API Responses

**DON'T:**
```typescript
const customerCount = customers?.length; // Only works if response is array
const quoteCount = quotes?.total;        // Inconsistent access pattern
```

**DO:**
```typescript
const customerCount = customers?.total || 0; // Consistent access pattern
const quoteCount = quotes?.total || 0;       // Same for all endpoints
```

### Pitfall 4: Forgetting Total Count Query

**DON'T:**
```typescript
const results = await db.query.table.findMany({
  where: whereClause,
  limit: input.limit,
});

return {
  items: results,
  total: results.length, // This is WRONG - only current page count
  hasMore: false,
};
```

**DO:**
```typescript
const results = await db.query.table.findMany({
  where: whereClause,
  limit: input.limit,
});

const countResult = await db
  .select({ count: sql<number>`count(*)` })
  .from(table)
  .where(whereClause);

const total = Number(countResult[0]?.count ?? 0);

return {
  items: results,
  total, // Correct total count
  hasMore: input.offset + results.length < total,
};
```

## Code Review Checklist

When reviewing API endpoints, verify:

- [ ] List endpoints return `{ items, total, hasMore }` format
- [ ] Total count is calculated with separate COUNT query
- [ ] `hasMore` calculation uses: `offset + items.length < total`
- [ ] Frontend uses `.total` for counts, not `.length`
- [ ] Frontend uses `.items` to access the array
- [ ] TypeScript types match the standard interface
- [ ] Pagination parameters include `limit` and `offset`
- [ ] Default values are sensible (limit: 50, offset: 0)

## Migration Guide

### Updating Existing Endpoints

If you have an endpoint that returns a flat array:

1. **Update the backend:**
```typescript
// Before
.query(async ({ ctx, input }) => {
  const results = await db.query.table.findMany({
    where: conditions,
    limit: input.limit,
  });
  return results;
});

// After
.query(async ({ ctx, input }) => {
  const results = await db.query.table.findMany({
    where: conditions,
    limit: input.limit,
    offset: input.offset,
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(conditions);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    items: results,
    total,
    hasMore: input.offset + results.length < total,
  };
});
```

2. **Update the frontend:**
```typescript
// Before
const customers = data;
const count = customers?.length;
customers?.map(...)

// After
const customers = data?.items || [];
const count = data?.total || 0;
customers.map(...)
```

3. **Update TypeScript types if needed:**
```typescript
// Add to shared types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
```

## Performance Considerations

### Counting Large Tables

For very large tables, consider:

1. **Approximate counts for UI display:**
```typescript
// Use EXPLAIN for estimates (PostgreSQL)
const estimate = await db.execute(
  sql`SELECT reltuples::BIGINT AS estimate FROM pg_class WHERE relname = 'table_name'`
);
```

2. **Cached counts:**
```typescript
// Cache total counts for frequently accessed data
const cached = await redis.get(`count:table:${companyId}`);
if (cached) return cached;

const count = await db.select({ count: sql`count(*)` }).from(table);
await redis.set(`count:table:${companyId}`, count, 'EX', 300);
```

3. **Skip counts when not needed:**
```typescript
// If UI doesn't need exact count, skip the query
return {
  items: results,
  total: -1, // Indicates count not calculated
  hasMore: results.length === input.limit, // Estimate
};
```

## Testing

### Unit Tests

```typescript
describe('list endpoint', () => {
  it('should return paginated response format', async () => {
    const result = await caller.resource.list({ limit: 10, offset: 0 });

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('hasMore');
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe('number');
    expect(typeof result.hasMore).toBe('boolean');
  });

  it('should calculate hasMore correctly', async () => {
    // Assuming 100 items in database
    const page1 = await caller.resource.list({ limit: 50, offset: 0 });
    expect(page1.hasMore).toBe(true);

    const page2 = await caller.resource.list({ limit: 50, offset: 50 });
    expect(page2.hasMore).toBe(false);
  });

  it('should return accurate total count', async () => {
    const result = await caller.resource.list({ limit: 10, offset: 0 });
    expect(result.total).toBeGreaterThanOrEqual(result.items.length);
  });
});
```

## Related Resources

- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [API Design Best Practices](https://restfulapi.net/)

## Questions?

If you have questions about API consistency:
1. Check this document first
2. Look at existing implementations (e.g., `quote.list`)
3. Ask in the #engineering Slack channel
4. Update this document with new learnings

---

**Last Updated:** 2026-02-05
**Maintainer:** Engineering Team
