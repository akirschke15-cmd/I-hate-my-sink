import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@ihms/api';

// WORKAROUND: tRPC v11 + TypeScript 5.3+ + moduleResolution:"bundler" causes type
// resolution issues in monorepos when consuming raw TypeScript from workspace packages.
// The AppRouter type import fails to resolve properly in TypeScript's type checking,
// resulting in tRPC returning error type strings instead of the actual router type.
// However, at runtime and in the IDE (which uses a different type resolution), this
// works correctly. This type assertion bypasses the TypeScript compiler's module
// resolution issue while preserving full runtime type safety.
// See: https://github.com/trpc/trpc/discussions/5258
// To fix properly: Build packages to .js + .d.ts or switch moduleResolution to "node16"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<AppRouter>() as any;

function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

// Token refresh state to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    // tRPC batch format for mutations
    const response = await fetch('/trpc/auth.refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        '0': {
          json: { refreshToken },
        },
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // tRPC batch response format
    const result = data[0]?.result?.data?.json;

    if (result?.accessToken && result?.refreshToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function handleTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshAccessToken().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

export function clearAuthAndRedirect(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Redirect to login if not already there
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

// Check if an error is an UNAUTHORIZED error
export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return error.data?.code === 'UNAUTHORIZED';
  }
  return false;
}

// Global error handler for UNAUTHORIZED errors
export async function handleUnauthorizedError(): Promise<boolean> {
  const success = await handleTokenRefresh();
  if (!success) {
    clearAuthAndRedirect();
  }
  return success;
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        headers() {
          const token = getAuthToken();
          return token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {};
        },
      }),
    ],
    transformer: superjson,
  });
}

export type { AppRouter };
