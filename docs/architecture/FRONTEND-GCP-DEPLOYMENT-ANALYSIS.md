# IHMS Frontend - GCP Deployment Analysis

## Executive Summary

The IHMS Progressive Web App (PWA) frontend currently uses **hardcoded relative URLs** (`/trpc`) for API communication, which works in development via Vite's proxy but requires significant changes for GCP deployment where frontend and backend will be hosted separately.

### Current Architecture

- **Frontend**: React 18 + Vite + PWA (apps/web/)
- **API Communication**: tRPC via hardcoded `/trpc` endpoint
- **Development**: Vite proxy forwards `/trpc` to `http://localhost:3011`
- **Build Output**: Static files in `dist/` (438.84 KB precached)
- **Offline**: IndexedDB + Service Worker with NetworkFirst caching

### GCP Deployment Target

- **Frontend Hosting**: Cloud Storage + Cloud CDN
- **Backend**: Cloud Run
- **Challenge**: Frontend and backend on different domains/origins

---

## 1. API URL Configuration Changes

### Current Implementation

**File**: `apps/web/src/lib/trpc.ts` (Lines 114-126)

```typescript
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',  // ⚠️ HARDCODED - only works with dev proxy
        headers() {
          const token = getAuthToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

**File**: `apps/web/src/lib/trpc.ts` (Line 37)

```typescript
const response = await fetch('/trpc/auth.refresh', {
  // ⚠️ HARDCODED - token refresh also uses relative URL
```

**File**: `apps/web/src/contexts/OfflineContext.tsx` (Lines 98-113)

```typescript
function createStandaloneTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/trpc',  // ⚠️ HARDCODED - offline sync client
```

**File**: `apps/web/src/pages/QuoteDetailPage.tsx` (Line 203)

```typescript
const response = await fetch(
  `${import.meta.env.VITE_API_URL || 'http://localhost:3011'}/api/quotes/${id}/pdf`,
  // ✅ CORRECT - uses env var with fallback
```

### Required Changes

**Action 1**: Create environment-aware API URL utility

**New File**: `apps/web/src/lib/api-config.ts`

```typescript
/**
 * Get the API base URL based on environment.
 *
 * - Development: Uses Vite proxy (/trpc)
 * - Production: Uses Cloud Run backend URL from env var
 */
export function getApiUrl(): string {
  // Check if running in development mode
  if (import.meta.env.DEV) {
    return '/trpc';
  }

  // Production: use environment variable
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.error('VITE_API_URL not configured for production build');
    // Fallback to same-origin (won't work in GCP but prevents hard failure)
    return '/trpc';
  }

  // Ensure URL ends with /trpc
  return apiUrl.endsWith('/trpc') ? apiUrl : `${apiUrl}/trpc`;
}

/**
 * Get the base URL for non-tRPC endpoints (e.g., PDF downloads)
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:3011';
  }

  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.error('VITE_API_URL not configured for production build');
    return '';
  }

  // Remove /trpc suffix if present
  return apiUrl.replace(/\/trpc$/, '');
}
```

**Action 2**: Update tRPC client configuration

**File**: `apps/web/src/lib/trpc.ts` (Update lines 114-126)

```typescript
import { getApiUrl } from './api-config';

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: getApiUrl(),  // ✅ Environment-aware
        headers() {
          const token = getAuthToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

**Action 3**: Update token refresh endpoint

**File**: `apps/web/src/lib/trpc.ts` (Update line 37)

```typescript
import { getApiUrl } from './api-config';

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${getApiUrl()}/auth.refresh`, {  // ✅ Dynamic URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ '0': { json: { refreshToken } } }),
    });
    // ... rest of function
```

**Action 4**: Update offline sync client

**File**: `apps/web/src/contexts/OfflineContext.tsx` (Update lines 98-113)

```typescript
import { getApiUrl } from '../lib/api-config';

function createStandaloneTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: getApiUrl(),  // ✅ Environment-aware
        headers() {
          const token = localStorage.getItem('accessToken');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

**Action 5**: Update PDF download endpoint

**File**: `apps/web/src/pages/QuoteDetailPage.tsx` (Update line 203)

```typescript
import { getApiBaseUrl } from '../lib/api-config';

const response = await fetch(
  `${getApiBaseUrl()}/api/quotes/${id}/pdf`,  // ✅ Use utility function
  {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  }
);
```

---

## 2. Environment Variables Configuration

### Current State

**No `.env` files exist** in `apps/web/`. Environment variables are not currently used (except one instance in QuoteDetailPage.tsx).

### Required Files

**File**: `apps/web/.env.development` (Git-ignored, local only)

```bash
# Development - uses Vite proxy
# No VITE_API_URL needed - uses relative /trpc path
```

**File**: `apps/web/.env.production.example` (Committed to git)

```bash
# Example production configuration
# Copy to .env.production and fill in actual values

# Cloud Run backend URL (no trailing slash)
VITE_API_URL=https://ihms-backend-HASH-uc.a.run.app

# Optional: Environment name for debugging
VITE_ENV=production
```

**File**: `apps/web/.env.production` (Git-ignored, set during build)

```bash
# Production environment variables
# Set in Cloud Build or local production builds
VITE_API_URL=https://ihms-backend-HASH-uc.a.run.app
VITE_ENV=production
```

**File**: `apps/web/.env.staging` (Optional, for staging environment)

```bash
VITE_API_URL=https://ihms-backend-staging-HASH-uc.a.run.app
VITE_ENV=staging
```

### Update .gitignore

**File**: `.gitignore` (Add to root)

```gitignore
# Environment files
apps/web/.env.development
apps/web/.env.production
apps/web/.env.staging
apps/web/.env.local
```

### Vite Environment Variable Rules

1. **Prefix**: All exposed vars MUST start with `VITE_`
2. **Build-time only**: Env vars are embedded at build time, not runtime
3. **Access**: Use `import.meta.env.VITE_API_URL` (NOT `process.env`)
4. **Type Safety**: Add types to `apps/web/src/vite-env.d.ts`

**File**: `apps/web/src/vite-env.d.ts` (Update)

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENV?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## 3. CORS and Cross-Origin Configuration

### Current State

**File**: `server/src/index.ts` (Backend - needs review)

Backend CORS configuration currently unknown. Must be updated to allow frontend origin.

### Required Backend Changes

**File**: `server/src/index.ts` (Update CORS middleware)

```typescript
import cors from 'cors';

const allowedOrigins = [
  'http://localhost:3010',  // Development
  'https://ihms.example.com',  // Production frontend URL
  'https://storage.googleapis.com',  // Cloud Storage (if direct access)
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Frontend Fetch Configuration

**No changes needed** - browsers automatically handle CORS for cross-origin requests.

### Credentials and Cookies

**Current**: Uses `Authorization: Bearer` header (not cookies)
**Action**: No changes needed - header-based auth works across origins

---

## 4. PWA Service Worker Configuration

### Current Configuration

**File**: `apps/web/vite.config.ts` (Lines 39-57)

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./i,  // ⚠️ Won't match Cloud Run URLs
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
},
```

### Required Changes

**File**: `apps/web/vite.config.ts` (Update workbox config)

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'I Hate My Sink',
        short_name: 'IHMS',
        description: 'Sink Selection Configurator for Field Sales',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [/* existing icons */],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,jpg}'],  // Add image formats
        runtimeCaching: [
          {
            // Match Cloud Run backend URLs
            urlPattern: ({ url }) => {
              // Cache all requests to backend API
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3011';
              return url.href.startsWith(apiUrl);
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,  // Fallback to cache after 10s
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images from Cloud Storage or CDN
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        // Clean old caches on activation
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // ... rest of config
});
```

**Issue**: Vite config cannot access `import.meta.env` at build-time config level.

**Solution**: Use environment variable directly in config:

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      VitePWA({
        workbox: {
          runtimeCaching: [
            {
              urlPattern: ({ url }) => {
                const apiUrl = env.VITE_API_URL || 'http://localhost:3011';
                return url.href.startsWith(apiUrl);
              },
              handler: 'NetworkFirst',
              // ... options
            },
          ],
        },
      }),
    ],
  };
});
```

### Service Worker Debugging

**Action**: Add service worker update notification

**File**: `apps/web/src/main.tsx` (Add after ReactDOM.createRoot)

```typescript
import { registerSW } from 'virtual:pwa-register';

// Register service worker with update notification
const updateSW = registerSW({
  onNeedRefresh() {
    // Show toast notification for app update
    if (confirm('New version available! Reload to update?')) {
      updateSW(true);  // Force update and reload
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
```

---

## 5. Static Asset Hosting Strategy

### Build Output Structure

```
apps/web/dist/
├── index.html                    # Entry point
├── manifest.webmanifest          # PWA manifest
├── registerSW.js                 # Service worker registration
├── sw.js                         # Service worker (1.8 KB)
├── workbox-321c23cd.js          # Workbox runtime (22.5 KB)
├── assets/
│   ├── index-B3BmfKjy.css      # Styles (35.36 KB)
│   └── index-BUNAZega.js       # App bundle (411.56 KB)
├── images/
│   └── sinks/                   # Product images (~2.4 MB)
│       ├── castiron-undermount-30.webp
│       ├── copper-farmhouse-30.jpg
│       └── ...
└── *.svg                         # Icons (favicon, PWA icons)
```

**Total Precached**: 438.84 KB (excludes images)

### Cloud Storage Bucket Configuration

**Bucket Name**: `ihms-frontend` (or custom domain bucket)

**Upload Strategy**:
```bash
# Upload all files to bucket root
gsutil -m rsync -r -d apps/web/dist/ gs://ihms-frontend/

# Set index.html as default
gsutil web set -m index.html -e index.html gs://ihms-frontend

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://ihms-frontend
```

**Cache Headers** (Set via Cloud Build):

```bash
# Immutable assets (hashed filenames) - cache forever
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://ihms-frontend/assets/*

# Service worker - no cache (must check for updates)
gsutil setmeta -h "Cache-Control:no-cache, no-store, must-revalidate" \
  gs://ihms-frontend/sw.js

gsutil setmeta -h "Cache-Control:no-cache, no-store, must-revalidate" \
  gs://ihms-frontend/registerSW.js

# index.html - short cache (1 hour)
gsutil setmeta -h "Cache-Control:public, max-age=3600, must-revalidate" \
  gs://ihms-frontend/index.html

# Images - long cache (30 days)
gsutil -m setmeta -h "Cache-Control:public, max-age=2592000" \
  gs://ihms-frontend/images/**
```

### Cloud CDN Configuration

**Enable Cloud CDN**:
```bash
# Create backend bucket
gcloud compute backend-buckets create ihms-frontend-backend \
  --gcp-backend-bucket=ihms-frontend \
  --enable-cdn

# Configure CDN cache policies
gcloud compute backend-buckets update ihms-frontend-backend \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600 \
  --max-ttl=86400 \
  --client-ttl=3600
```

**CDN Cache Key**:
- Include query strings (for cache busting)
- Exclude user-specific headers

**Cache Invalidation** (after deployment):
```bash
# Invalidate specific paths
gcloud compute url-maps invalidate-cdn-cache ihms-frontend-lb \
  --path "/index.html" \
  --path "/sw.js" \
  --path "/manifest.webmanifest"
```

---

## 6. Build Process Updates

### Current Build Script

**File**: `apps/web/package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",  // ⚠️ No env handling
    "preview": "vite preview"
  }
}
```

### Updated Build Scripts

**File**: `apps/web/package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:production": "tsc && vite build --mode production",
    "build:staging": "tsc && vite build --mode staging",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

### Cloud Build Configuration

**File**: `cloudbuild-frontend.yaml` (New file at project root)

```yaml
steps:
  # Step 1: Install dependencies
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm install -g pnpm@8
        pnpm install --frozen-lockfile

  # Step 2: Build frontend with production env vars
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm install -g pnpm@8
        export VITE_API_URL=${_BACKEND_URL}
        pnpm --filter @ihms/web build:production
    env:
      - 'VITE_API_URL=${_BACKEND_URL}'
      - 'VITE_ENV=production'

  # Step 3: Upload to Cloud Storage
  - name: 'gcr.io/cloud-builders/gsutil'
    args:
      - '-m'
      - 'rsync'
      - '-r'
      - '-d'
      - 'apps/web/dist/'
      - 'gs://${_BUCKET_NAME}/'

  # Step 4: Set cache headers for assets
  - name: 'gcr.io/cloud-builders/gsutil'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Immutable assets
        gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
          gs://${_BUCKET_NAME}/assets/*

        # Service worker - no cache
        gsutil setmeta -h "Cache-Control:no-cache, no-store, must-revalidate" \
          gs://${_BUCKET_NAME}/sw.js
        gsutil setmeta -h "Cache-Control:no-cache, no-store, must-revalidate" \
          gs://${_BUCKET_NAME}/registerSW.js

        # index.html - short cache
        gsutil setmeta -h "Cache-Control:public, max-age=3600, must-revalidate" \
          gs://${_BUCKET_NAME}/index.html

        # Images - medium cache
        gsutil -m setmeta -h "Cache-Control:public, max-age=2592000" \
          gs://${_BUCKET_NAME}/images/**

  # Step 5: Invalidate CDN cache
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'compute'
      - 'url-maps'
      - 'invalidate-cdn-cache'
      - '${_LOAD_BALANCER_NAME}'
      - '--path=/index.html'
      - '--path=/sw.js'
      - '--path=/manifest.webmanifest'
      - '--async'

substitutions:
  _BACKEND_URL: 'https://ihms-backend-HASH-uc.a.run.app'
  _BUCKET_NAME: 'ihms-frontend'
  _LOAD_BALANCER_NAME: 'ihms-frontend-lb'

timeout: '1200s'  # 20 minutes

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'N1_HIGHCPU_8'
```

**Trigger Setup**:
```bash
# Create Cloud Build trigger for frontend deployments
gcloud builds triggers create github \
  --name="ihms-frontend-deploy" \
  --repo-name="IHMS" \
  --repo-owner="YourGitHubUsername" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-frontend.yaml" \
  --included-files="apps/web/**,packages/shared/**,packages/api/**"
```

---

## 7. Offline Sync Error Handling

### Current Implementation

**File**: `apps/web/src/contexts/OfflineContext.tsx` (Lines 36-56)

```typescript
const syncPending = useCallback(async () => {
  if (isSyncing || !isOnline) return;

  setIsSyncing(true);
  try {
    const pending = await getPendingSyncs();

    for (const item of pending) {
      try {
        await processSyncItem(item);  // Uses /trpc endpoint
        await removePendingSync(item.id);
        setPendingSyncCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to sync item:', item.id, error);
        // Item stays in queue for retry
      }
    }
  } finally {
    setIsSyncing(false);
  }
}, [isOnline, isSyncing]);
```

### Cloud-Specific Error Handling

**Issue**: Cloud Run cold starts can cause 5-10 second delays

**Action**: Update `processSyncItem` to handle cloud-specific errors

**File**: `apps/web/src/contexts/OfflineContext.tsx` (Update error handling)

```typescript
async function processSyncItem(item: PendingSync<unknown>): Promise<void> {
  const client = createStandaloneTRPCClient();

  console.log('[OfflineSync] Syncing:', {
    id: item.id,
    entity: item.entity,
    type: item.type,
    retryCount: item.retryCount,
  });

  try {
    // Add timeout for cloud cold starts
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 30000)  // 30s
    );

    const syncOperation = (async () => {
      switch (item.entity) {
        case 'customer': {
          if (item.type === 'create') {
            const result = await client.customer.create.mutate(item.data as any);
            // ... rest of logic
          }
          break;
        }
        // ... other cases
      }
    })();

    // Race between sync operation and timeout
    await Promise.race([syncOperation, timeout]);

  } catch (error) {
    // Cloud-specific error handling
    if (error instanceof Error) {
      // Cold start timeout - retry later
      if (error.message === 'Request timeout') {
        console.warn('[OfflineSync] Timeout - backend may be cold starting');
        throw error;  // Keep in queue for retry
      }

      // Network errors - retry later
      if (error.message.includes('fetch')) {
        console.warn('[OfflineSync] Network error - will retry');
        throw error;
      }

      // CORS errors - configuration issue, alert developer
      if (error.message.includes('CORS')) {
        console.error('[OfflineSync] CORS error - check backend configuration');
        // Don't retry CORS errors - they won't fix themselves
        // Remove from queue to prevent infinite retries
        return;
      }
    }

    console.error('[OfflineSync] Sync failed:', error);
    throw error;  // Re-throw to keep item in queue for retry
  }
}
```

### Retry Strategy

**Add exponential backoff for cloud resilience**:

```typescript
// Update PendingSync interface in packages/shared
interface PendingSync<T> {
  id: string;
  entity: 'customer' | 'measurement' | 'quote';
  type: 'create' | 'update';
  data: T;
  createdAt: Date;
  retryCount: number;
  lastAttempt?: Date;
  nextRetry?: Date;  // New field for exponential backoff
}

// In OfflineContext.tsx
const syncPending = useCallback(async () => {
  if (isSyncing || !isOnline) return;

  setIsSyncing(true);
  try {
    const pending = await getPendingSyncs();
    const now = Date.now();

    for (const item of pending) {
      // Check if item is ready for retry (exponential backoff)
      if (item.nextRetry && item.nextRetry > now) {
        console.log(`[OfflineSync] Skipping ${item.id} - retry scheduled for ${new Date(item.nextRetry)}`);
        continue;
      }

      try {
        await processSyncItem(item);
        await removePendingSync(item.id);
        setPendingSyncCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to sync item:', item.id, error);

        // Update retry metadata with exponential backoff
        const retryCount = item.retryCount + 1;
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 60000);  // Max 1 minute
        const nextRetry = now + backoffMs;

        await addPendingSync({
          ...item,
          retryCount,
          lastAttempt: new Date(),
          nextRetry,
        });
      }
    }
  } finally {
    setIsSyncing(false);
  }
}, [isOnline, isSyncing]);
```

---

## 8. Content Security Policy (CSP)

### Current State

**No CSP headers** are currently configured.

### Required CSP Headers

**File**: `apps/web/index.html` (Add meta tag)

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https://storage.googleapis.com;
    connect-src 'self' https://ihms-backend-*.run.app https://storage.googleapis.com;
    worker-src 'self' blob:;
    manifest-src 'self';
  ">

  <!-- Rest of head -->
</head>
```

**Better**: Set CSP via Cloud Load Balancer headers (more secure, easier to update)

**Cloud Load Balancer Configuration**:
```bash
# Add custom response headers to backend bucket
gcloud compute backend-buckets update ihms-frontend-backend \
  --custom-response-header='Content-Security-Policy: default-src self; script-src self unsafe-inline; connect-src self https://*.run.app'
```

---

## 9. Performance Optimizations

### Bundle Size Analysis

**Current**: 411.56 KB main bundle (108.36 KB gzipped)

**Action**: Add bundle size analyzer

```bash
pnpm add -D rollup-plugin-visualizer
```

**File**: `apps/web/vite.config.ts`

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({...}),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunk
          vendor: ['react', 'react-dom', 'react-router-dom'],
          trpc: ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],
        },
      },
    },
  },
});
```

### Image Optimization

**Current**: Mix of `.jpg` and `.webp` formats (2.4 MB total)

**Action**: Convert all images to WebP with proper compression

```bash
# Install image optimization tool
pnpm add -D vite-plugin-imagemin

# Add to vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      webp: {
        quality: 75,
      },
      mozjpeg: {
        quality: 75,
      },
    }),
  ],
});
```

### Preload Critical Assets

**File**: `apps/web/index.html`

```html
<head>
  <!-- Preload critical CSS -->
  <link rel="preload" href="/assets/index-*.css" as="style">

  <!-- Preconnect to backend API -->
  <link rel="preconnect" href="https://ihms-backend-HASH-uc.a.run.app" crossorigin>

  <!-- DNS prefetch for Google Fonts -->
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
</head>
```

**Note**: Hash in filename is dynamic - use build-time injection or HTTP/2 Server Push

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] Create `apps/web/.env.production` with `VITE_API_URL`
- [ ] Update backend CORS to allow frontend origin
- [ ] Create Cloud Storage bucket (`ihms-frontend`)
- [ ] Configure Cloud CDN backend bucket
- [ ] Set up Cloud Load Balancer with HTTPS
- [ ] Configure custom domain DNS (optional)

### Code Changes

- [ ] Create `apps/web/src/lib/api-config.ts`
- [ ] Update `apps/web/src/lib/trpc.ts` to use `getApiUrl()`
- [ ] Update `apps/web/src/contexts/OfflineContext.tsx` to use `getApiUrl()`
- [ ] Update `apps/web/src/pages/QuoteDetailPage.tsx` to use `getApiBaseUrl()`
- [ ] Update `apps/web/vite.config.ts` workbox config for Cloud Run URLs
- [ ] Add `apps/web/src/vite-env.d.ts` type definitions
- [ ] Update `apps/web/.gitignore` to exclude `.env.*` files
- [ ] Add offline sync error handling for cloud-specific scenarios

### Build Configuration

- [ ] Create `cloudbuild-frontend.yaml`
- [ ] Update `apps/web/package.json` with environment-specific scripts
- [ ] Test production build locally: `VITE_API_URL=https://backend pnpm build:production`
- [ ] Verify bundle size and performance

### Cloud Build Trigger

- [ ] Create GitHub Cloud Build trigger for frontend
- [ ] Set substitution variables (`_BACKEND_URL`, `_BUCKET_NAME`)
- [ ] Test trigger with manual build
- [ ] Verify cache headers are set correctly

### Post-Deployment

- [ ] Test offline mode with production backend
- [ ] Verify service worker updates correctly
- [ ] Test CORS from production frontend to backend
- [ ] Monitor Cloud CDN cache hit ratio
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure uptime monitoring

---

## 11. Testing Strategy

### Local Production Build Testing

```bash
# 1. Set production environment variables
export VITE_API_URL=https://ihms-backend-HASH-uc.a.run.app

# 2. Build production bundle
pnpm --filter @ihms/web build:production

# 3. Preview production build locally
pnpm --filter @ihms/web preview

# 4. Test in browser at http://localhost:4173
# - Verify API calls go to Cloud Run backend
# - Test offline mode
# - Check service worker registration
```

### Cloud Storage Upload Testing

```bash
# 1. Upload to test bucket
gsutil -m rsync -r apps/web/dist/ gs://ihms-frontend-test/

# 2. Set test bucket to public
gsutil iam ch allUsers:objectViewer gs://ihms-frontend-test

# 3. Access via Cloud Storage URL
open https://storage.googleapis.com/ihms-frontend-test/index.html

# 4. Test functionality
# - API calls to backend
# - Offline mode
# - Authentication
```

### CORS Testing

```bash
# Test CORS from browser console
fetch('https://ihms-backend-HASH-uc.a.run.app/trpc/health', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Service Worker Testing

```typescript
// In browser DevTools console

// 1. Check service worker registration
navigator.serviceWorker.getRegistrations().then(console.log);

// 2. Check cache contents
caches.keys().then(cacheNames => {
  cacheNames.forEach(cacheName => {
    caches.open(cacheName).then(cache => {
      cache.keys().then(keys => console.log(cacheName, keys));
    });
  });
});

// 3. Test offline mode
// - Go offline in DevTools Network tab
// - Reload page
// - Create measurement (should queue for sync)
// - Go online
// - Verify sync occurs
```

---

## Summary of Required Changes

### New Files (7 files)

1. `apps/web/src/lib/api-config.ts` - Environment-aware API URL configuration
2. `apps/web/.env.production.example` - Example production env vars
3. `apps/web/.env.production` - Actual production env vars (git-ignored)
4. `apps/web/.env.staging` - Staging env vars (optional)
5. `cloudbuild-frontend.yaml` - Cloud Build configuration for frontend
6. `apps/web/.dockerignore` - Exclude unnecessary files from Cloud Build
7. `apps/web/deploy.sh` - Manual deployment script (optional)

### Modified Files (8 files)

1. `apps/web/src/lib/trpc.ts` - Use dynamic API URL
2. `apps/web/src/contexts/OfflineContext.tsx` - Use dynamic API URL + cloud error handling
3. `apps/web/src/pages/QuoteDetailPage.tsx` - Use `getApiBaseUrl()` utility
4. `apps/web/vite.config.ts` - Update workbox caching for Cloud Run URLs
5. `apps/web/src/vite-env.d.ts` - Add environment variable type definitions
6. `apps/web/package.json` - Add environment-specific build scripts
7. `apps/web/index.html` - Add CSP headers and preload hints
8. `.gitignore` - Exclude `.env.*` files

### Infrastructure Setup

1. Create Cloud Storage bucket for frontend
2. Configure Cloud CDN backend bucket
3. Set up Cloud Load Balancer with HTTPS
4. Configure custom domain (optional)
5. Set up Cloud Build trigger
6. Update backend CORS configuration

### Total Effort Estimate

- **Code Changes**: 4-6 hours
- **Cloud Infrastructure**: 2-3 hours
- **Testing & Debugging**: 2-4 hours
- **Documentation**: 1 hour

**Total**: 9-14 hours for complete frontend GCP deployment configuration

---

## Next Steps

1. Review this analysis with team
2. Prioritize changes (API config is highest priority)
3. Create tasks for each section
4. Implement changes incrementally
5. Test each change in isolation
6. Deploy to staging environment first
7. Monitor production deployment closely

---

**Document Version**: 1.0
**Last Updated**: 2026-02-03
**Author**: Frontend Engineer Agent
