import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@ihms/api';

// WORKAROUND: tRPC v11 + TypeScript 5.3+ + moduleResolution:"bundler" causes type
// resolution issues in monorepos when consuming raw TypeScript from workspace packages.
// The runtime behavior is correct; this cast works around a TypeScript limitation.
// See: https://github.com/trpc/trpc/discussions/5258
// To fix properly: Build packages to emit .js + .d.ts files instead of raw .ts exports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<AppRouter>() as any;

function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
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
  });
}

export type { AppRouter };
