# IHMS Testing Quick Start Guide

**For Developers:** Get started writing tests for IHMS

---

## Running Existing Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test packages/api/src/routers/auth.test.ts

# Run tests matching pattern
pnpm test -- --grep "login"
```

---

## Writing Unit Tests

### Test File Location
- Place test files next to source files: `auth.ts` → `auth.test.ts`
- Or in `__tests__` directory: `__tests__/auth.test.ts`

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

describe('Component/Function Name', () => {
  beforeAll(async () => {
    // Setup that runs once before all tests
  });

  beforeEach(async () => {
    // Setup that runs before each test
  });

  it('should do something specific', async () => {
    // Arrange - Setup test data and conditions
    const input = 'test-value';

    // Act - Execute the code under test
    const result = await functionUnderTest(input);

    // Assert - Verify the expected outcome
    expect(result).toBe('expected-value');
  });

  it('should handle error case', async () => {
    // Test error scenarios
    await expect(functionUnderTest('invalid')).rejects.toThrow('Error message');
  });
});
```

---

## Testing tRPC Procedures

### Setup Test Caller

```typescript
import { createTestCaller, createAuthenticatedContext } from '../test-utils';
import { TRPCError } from '@trpc/server';

describe('Customer Router', () => {
  it('should create customer', async () => {
    // Create authenticated test caller
    const ctx = createAuthenticatedContext({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'salesperson',
      companyId: 'test-company-id',
    });
    const caller = createTestCaller(ctx);

    // Call the procedure
    const result = await caller.customer.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    // Assert
    expect(result).toHaveProperty('id');
    expect(result.firstName).toBe('John');
  });

  it('should require authentication', async () => {
    // Create unauthenticated caller
    const caller = createTestCaller(createUnauthenticatedContext());

    // Protected procedures should throw
    await expect(
      caller.customer.create({
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow(TRPCError);
  });
});
```

---

## Testing Database Operations

### Use Test Database

```typescript
import { db } from '@ihms/db';
import { customers } from '@ihms/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Operations', () => {
  // Clean up after each test
  afterEach(async () => {
    await db.delete(customers).where(eq(customers.email, 'test@example.com'));
  });

  it('should create customer in database', async () => {
    const [customer] = await db
      .insert(customers)
      .values({
        companyId: 'test-company-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      })
      .returning();

    expect(customer).toBeDefined();
    expect(customer.email).toBe('test@example.com');

    // Verify in database
    const found = await db.query.customers.findFirst({
      where: eq(customers.id, customer.id),
    });

    expect(found).toBeDefined();
  });
});
```

---

## Testing Business Logic (Pure Functions)

### Example: Sink Matching Score Calculation

```typescript
// Create testable function
export function calculateMatchScore(
  sinkDimensions: { width: number; depth: number },
  cabinetDimensions: { width: number; depth: number }
): { score: number; fitRating: string; reasons: string[] } {
  // ... implementation
}

// Test it
describe('calculateMatchScore', () => {
  it('should return excellent fit for optimal clearance', () => {
    const sink = { width: 33, depth: 22 };
    const cabinet = { width: 36, depth: 24 };

    const result = calculateMatchScore(sink, cabinet);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.fitRating).toBe('excellent');
    expect(result.reasons).toContain('Excellent width fit with optimal clearance');
  });

  it('should disqualify sink that is too wide', () => {
    const sink = { width: 40, depth: 22 };
    const cabinet = { width: 36, depth: 24 };

    const result = calculateMatchScore(sink, cabinet);

    expect(result.score).toBeLessThan(0);
    expect(result.reasons).toContain('WARNING: Sink too wide for cabinet');
  });

  it('should handle edge case: sink exactly cabinet size', () => {
    const sink = { width: 36, depth: 24 };
    const cabinet = { width: 36, depth: 24 };

    const result = calculateMatchScore(sink, cabinet);

    expect(result.score).toBeLessThan(0);
    // No clearance = doesn't fit
  });
});
```

---

## Testing Calculations

### Example: Quote Totals

```typescript
describe('Quote Calculations', () => {
  it('should calculate line item total with discount', () => {
    const quantity = 2;
    const unitPrice = 100;
    const discountPercent = 10;

    const lineTotal = calculateLineTotal(quantity, unitPrice, discountPercent);

    expect(lineTotal).toBe(180); // 2 * 100 * 0.9
  });

  it('should calculate quote total with tax', () => {
    const lineItems = [
      { total: 100 },
      { total: 50 },
    ];
    const taxRate = 0.05; // 5%
    const discount = 10;

    const result = calculateQuoteTotal(lineItems, taxRate, discount);

    // Subtotal: 150
    // After discount: 140
    // Tax: 7
    // Total: 147
    expect(result.subtotal).toBe(150);
    expect(result.tax).toBe(7);
    expect(result.total).toBe(147);
  });

  it('should round to 2 decimal places', () => {
    const result = calculateLineTotal(1, 10.005, 0);

    expect(result).toBe(10.01); // Not 10.005
  });
});
```

---

## Testing Async Operations

### Example: API Call with Retry

```typescript
describe('API with Retry', () => {
  it('should retry failed requests', async () => {
    let attempts = 0;
    const mockFn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return 'success';
    });

    const result = await retryOperation(mockFn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should fail after max retries', async () => {
    const mockFn = vi.fn(async () => {
      throw new Error('Network error');
    });

    await expect(
      retryOperation(mockFn, { maxRetries: 3 })
    ).rejects.toThrow('Network error');

    expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });
});
```

---

## Mocking External Dependencies

### Example: Mocking Email Service

```typescript
import { vi } from 'vitest';
import { sendEmail } from '../services/email';

// Mock the entire module
vi.mock('../services/email', () => ({
  sendEmail: vi.fn(),
}));

describe('Quote Email', () => {
  it('should send email when quote is sent', async () => {
    // Cast to mock for type safety
    const mockSendEmail = sendEmail as vi.MockedFunction<typeof sendEmail>;
    mockSendEmail.mockResolvedValue({ success: true });

    await sendQuoteEmail('quote-id');

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        subject: expect.stringContaining('Quote'),
      })
    );
  });
});
```

---

## Testing Error Handling

### Example: Validation Errors

```typescript
describe('Input Validation', () => {
  it('should reject invalid email format', async () => {
    const caller = createTestCaller(createAuthenticatedContext());

    await expect(
      caller.customer.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
      })
    ).rejects.toThrow(); // Zod validation error
  });

  it('should reject negative dimensions', async () => {
    await expect(
      caller.measurement.create({
        customerId: 'customer-id',
        cabinetWidthInches: -5,
        cabinetDepthInches: 24,
        cabinetHeightInches: 34,
      })
    ).rejects.toThrow('must be a positive number');
  });
});
```

---

## Parametrized Tests (Data-Driven)

### Example: Test Multiple Scenarios

```typescript
describe('Email Validation', () => {
  const validEmails = [
    'test@example.com',
    'user+tag@domain.co.uk',
    'first.last@subdomain.example.com',
  ];

  validEmails.forEach((email) => {
    it(`should accept valid email: ${email}`, () => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  const invalidEmails = [
    'not-an-email',
    '@example.com',
    'user@',
    'user @example.com',
  ];

  invalidEmails.forEach((email) => {
    it(`should reject invalid email: ${email}`, () => {
      expect(validateEmail(email)).toBe(false);
    });
  });
});
```

---

## Testing with Fixtures (Test Data)

### Create Reusable Test Data

```typescript
// fixtures/customers.ts
export const customerFixtures = {
  validCustomer: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
  },
  minimalCustomer: {
    firstName: 'Jane',
    lastName: 'Smith',
  },
};

// Use in tests
import { customerFixtures } from './fixtures/customers';

it('should create customer with full data', async () => {
  const result = await caller.customer.create(customerFixtures.validCustomer);
  expect(result.email).toBe(customerFixtures.validCustomer.email);
});
```

---

## Test Data Factories (Advanced)

### Create Dynamic Test Data

```typescript
// factories/customer.factory.ts
import { faker } from '@faker-js/faker';

export function createCustomerFactory(overrides = {}) {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode(),
    },
    ...overrides,
  };
}

// Use in tests
it('should create customer', async () => {
  const customerData = createCustomerFactory({
    email: 'specific@example.com', // Override specific field
  });

  const result = await caller.customer.create(customerData);
  expect(result.email).toBe('specific@example.com');
});
```

---

## Coverage Reports

### Generate Coverage Report

```bash
# Run tests with coverage
pnpm test -- --coverage

# Coverage report generated in coverage/ directory
# Open coverage/index.html in browser
```

### Interpret Coverage

```
File                 | % Stmts | % Branch | % Funcs | % Lines |
---------------------|---------|----------|---------|---------|
auth.ts              |   95.00 |    85.00 |   90.00 |   94.00 |
customer.ts          |   80.00 |    70.00 |   75.00 |   78.00 |
measurement.ts       |   60.00 |    50.00 |   55.00 |   58.00 | ⚠️ Low
sink-matching.ts     |    0.00 |     0.00 |    0.00 |    0.00 | ❌ No tests
```

**Focus on:**
- Files with < 70% coverage
- Files with complex business logic
- Files with 0% coverage

---

## Common Testing Patterns

### Pattern 1: AAA (Arrange, Act, Assert)

```typescript
it('should do something', async () => {
  // Arrange - Setup
  const input = 'test';
  const expected = 'TEST';

  // Act - Execute
  const result = transform(input);

  // Assert - Verify
  expect(result).toBe(expected);
});
```

### Pattern 2: Given-When-Then (BDD Style)

```typescript
it('should uppercase input', async () => {
  // Given a lowercase string
  const input = 'test';

  // When I transform it
  const result = transform(input);

  // Then it should be uppercase
  expect(result).toBe('TEST');
});
```

### Pattern 3: Test Error First

```typescript
describe('createCustomer', () => {
  // Test error cases first
  it('should throw when email invalid', async () => {...});
  it('should throw when name missing', async () => {...});

  // Then test success cases
  it('should create customer with valid data', async () => {...});
});
```

---

## Debugging Tests

### Run Single Test

```bash
# Run only tests matching "should create customer"
pnpm test -- --grep "should create customer"

# Run single test file
pnpm test packages/api/src/routers/customer.test.ts
```

### Use it.only / describe.only

```typescript
// Only run this test (temporarily during debugging)
it.only('should create customer', async () => {
  // ...
});

// Only run tests in this describe block
describe.only('Customer Creation', () => {
  it('test 1', () => {});
  it('test 2', () => {});
});
```

### Skip Tests

```typescript
// Skip this test temporarily
it.skip('flaky test - investigating', async () => {
  // ...
});
```

### Add Debug Logs

```typescript
it('should calculate total', async () => {
  const result = calculateTotal(lineItems);

  console.log('Line items:', lineItems);
  console.log('Result:', result);

  expect(result).toBe(150);
});
```

---

## Best Practices

### DO

- ✅ Write tests as you write code (TDD)
- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Test error cases and edge cases
- ✅ Clean up test data after tests
- ✅ Use test utilities and factories for DRY code
- ✅ Mock external dependencies (APIs, file system)
- ✅ Keep tests fast (< 100ms per test)
- ✅ Run tests before committing code

### DON'T

- ❌ Test implementation details (private methods)
- ❌ Write tests that depend on each other
- ❌ Use production database in tests
- ❌ Commit failing tests
- ❌ Skip writing tests for "simple" code
- ❌ Copy-paste test code (use factories)
- ❌ Test third-party libraries (trust they're tested)
- ❌ Make tests too complex (if test is hard to understand, refactor)

---

## Quick Reference: Vitest Matchers

```typescript
// Equality
expect(value).toBe(expected)           // Strict equality (===)
expect(value).toEqual(expected)        // Deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeDefined()
expect(value).toBeUndefined()
expect(value).toBeNull()

// Numbers
expect(value).toBeGreaterThan(3)
expect(value).toBeGreaterThanOrEqual(3)
expect(value).toBeLessThan(5)
expect(value).toBeLessThanOrEqual(5)
expect(value).toBeCloseTo(0.3)         // Floating point

// Strings
expect(value).toMatch(/pattern/)
expect(value).toContain('substring')

// Arrays/Iterables
expect(array).toContain(item)
expect(array).toHaveLength(3)

// Objects
expect(object).toHaveProperty('key')
expect(object).toMatchObject({ key: 'value' })

// Exceptions
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('Error message')
expect(async () => fn()).rejects.toThrow()

// Async
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow()

// Mocks
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith(arg1, arg2)
```

---

## Next Steps

1. Read the full test plan: `/c/Users/Akirs/IHMS/docs/TEST_PLAN.md`
2. Start with high-priority tests (Sink Matching, Quote Calculations)
3. Follow the patterns in this guide
4. Ask questions in the team chat
5. Review existing tests for examples

**Happy Testing!** 🧪

---

**Resources:**
- Vitest Docs: https://vitest.dev/
- Testing Library: https://testing-library.com/
- Playwright: https://playwright.dev/
- Test Plan: `/c/Users/Akirs/IHMS/docs/TEST_PLAN.md`
- Testing Summary: `/c/Users/Akirs/IHMS/docs/TESTING_SUMMARY.md`
