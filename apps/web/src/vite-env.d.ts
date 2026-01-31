/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '@ihms/api' {
  import type { AppRouter } from '../../../packages/api/src';
  export type { AppRouter };
}
