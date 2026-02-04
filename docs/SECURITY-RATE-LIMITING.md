# Rate Limiting - Authentication Endpoints

## Overview

Rate limiting is implemented on all authentication endpoints to prevent brute force attacks, credential stuffing, and API abuse. The implementation uses `express-rate-limit` middleware and is configured to work with tRPC's routing mechanism, including support for batched requests.

## Configuration

### Login Endpoint (`auth.login`)

- **Window**: 15 minutes
- **Max Attempts**: 5 per IP address (and email when available)
- **Key Strategy**: IP + email combination for better granularity
- **Response**: `429 Too Many Requests` with JSON error message

**Rationale**: Login attempts are limited to prevent credential stuffing and brute force attacks. The combination of IP and email allows legitimate users from shared IPs to attempt login while still protecting individual accounts.

### Register Endpoint (`auth.register`)

- **Window**: 1 hour
- **Max Attempts**: 3 per IP address
- **Key Strategy**: IP only
- **Response**: `429 Too Many Requests` with JSON error message

**Rationale**: Registration is more strictly limited to prevent automated account creation and abuse. The hourly window prevents rapid account creation from the same IP.

### Refresh Token Endpoint (`auth.refresh`)

- **Window**: 1 minute
- **Max Attempts**: 10 per IP address
- **Key Strategy**: IP only
- **Response**: `429 Too Many Requests` with JSON error message

**Rationale**: Token refresh should be infrequent (access tokens last 15 minutes). The 1-minute window with 10 attempts allows for legitimate retries and app startup scenarios while preventing token brute-forcing.

## Implementation Details

### tRPC Integration

The rate limiters are designed to work with tRPC's routing mechanism:

1. **Non-batched requests**: Procedure name appears in URL path (e.g., `/trpc/auth.login`)
2. **Batched requests**: Procedure name appears in request body metadata

The `isAuthProcedure()` helper function checks both patterns to ensure rate limiting works regardless of how the client calls the API.

### Response Headers

When rate limiting is active, the following headers are included in responses:

- `RateLimit-Limit`: Maximum number of requests allowed in the window
- `RateLimit-Remaining`: Number of requests remaining in the current window
- `RateLimit-Reset`: Timestamp when the rate limit window resets

### Error Response Format

When rate limited, the API returns:

```json
{
  "error": "Too many [login|registration|token refresh] attempts, please try again later"
}
```

Status Code: `429 Too Many Requests`

## Testing Rate Limits

### Manual Testing with cURL

**Test Login Rate Limiting:**

```bash
# Attempt 6 logins (5th should succeed, 6th should be rate limited)
for i in {1..6}; do
  curl -X POST http://localhost:3011/trpc/auth.login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

**Test Register Rate Limiting:**

```bash
# Attempt 4 registrations (3rd should succeed, 4th should be rate limited)
for i in {1..4}; do
  curl -X POST http://localhost:3011/trpc/auth.register \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","password":"test123","firstName":"Test","lastName":"User","companyId":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

**Test Refresh Rate Limiting:**

```bash
# Attempt 11 token refreshes (10th should succeed, 11th should be rate limited)
for i in {1..11}; do
  curl -X POST http://localhost:3011/trpc/auth.refresh \
    -H "Content-Type: application/json" \
    -d '{"refreshToken":"invalid-token"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 0.5
done
```

### Frontend Handling

The frontend should:

1. **Detect 429 responses**: Check for `429` status code
2. **Extract rate limit headers**: Read `RateLimit-Reset` to know when to retry
3. **Display user-friendly message**: "Too many attempts. Please try again in X minutes."
4. **Implement exponential backoff**: Don't immediately retry on 429

Example error handling in React Query:

```typescript
const loginMutation = trpc.auth.login.useMutation({
  onError: (error) => {
    if (error.message.includes('Too many')) {
      toast.error('Too many login attempts. Please try again in 15 minutes.');
    } else {
      toast.error('Login failed. Please check your credentials.');
    }
  },
});
```

## Security Considerations

### Distributed Denial of Service (DDoS)

The current implementation uses in-memory storage for rate limit counters. In a distributed environment (multiple server instances), consider:

1. **Redis store**: Use `rate-limit-redis` for shared state across instances
2. **Load balancer rate limiting**: Implement rate limiting at the load balancer level (e.g., AWS WAF, Cloudflare)
3. **IP allowlisting**: Allow trusted IPs to bypass rate limits (e.g., internal health checks)

### IP Spoofing

The rate limiter uses `req.ip` which can be spoofed if not behind a trusted proxy. Ensure:

1. **Trust proxy setting**: Express is configured to trust the proxy (already configured in `server/src/index.ts`)
2. **X-Forwarded-For validation**: Verify the load balancer/proxy is setting headers correctly

### Account Enumeration

The login endpoint returns the same error message for both invalid email and invalid password to prevent account enumeration. However, rate limiting by IP + email could reveal valid emails if an attacker notices different rate limit counters. This is an acceptable trade-off for better UX (users from shared IPs can attempt login).

## Future Enhancements

1. **Redis-backed storage**: Replace in-memory storage with Redis for distributed deployments
2. **CAPTCHA integration**: Add CAPTCHA after N failed attempts
3. **Account lockout**: Temporarily lock accounts after excessive failed login attempts
4. **Alerting**: Send alerts when rate limits are frequently hit (potential attack)
5. **Allowlisting**: Allow trusted IPs to bypass rate limits
6. **Per-user rate limiting**: Track failed attempts per user ID (not just IP)

## References

- [express-rate-limit documentation](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP: Brute Force](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
