# I Hate My Sink (IHMS) - Developer Guide

## Project Overview

IHMS is a Progressive Web App (PWA) for field sales teams to capture sink measurements, match sinks from a product catalog, and generate customer quotes. The app works offline, syncing data when connectivity returns.

## Development Commands

```bash
# Start all services (PostgreSQL, Redis) and dev servers
docker compose up -d && pnpm dev

# Install dependencies
pnpm install

# Run individual services
pnpm --filter @ihms/web dev    # Frontend only (port 3010)
pnpm --filter @ihms/server dev # Backend only (port 3011)

# Database operations
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations
pnpm db:push      # Push schema directly (dev only)
pnpm db:studio    # Open Drizzle Studio GUI

# Quality checks
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
pnpm test         # Vitest
pnpm format       # Prettier

# Build for production
pnpm build
```

## Architecture

### Monorepo Structure

```
IHMS/
├── apps/web/         # React 18 + Vite PWA
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations
│   ├── api/          # tRPC routers
│   └── shared/       # Zod schemas + TypeScript types
├── server/           # Express + tRPC backend
└── docker/           # PostgreSQL init scripts
```

### Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, tRPC React Query
- **Backend**: Express, tRPC, Node.js 20
- **Database**: PostgreSQL 16, Drizzle ORM
- **Auth**: JWT (access + refresh tokens)
- **Offline**: PWA with IndexedDB (idb library)
- **Tooling**: PNPM workspaces, Turborepo

## Domain Terminology

### Measurements

- **Cabinet dimensions**: Width, depth, height of the base cabinet (in inches)
- **Countertop thickness**: Standard thicknesses are 1.25", 1.5", 2"
- **Existing cutout**: Dimensions of any existing sink cutout when replacing

### Sink Types

- **Undermount**: Mounted below countertop, seamless look
- **Drop-in (Top-mount)**: Rim sits on countertop surface
- **Farmhouse (Apron-front)**: Front panel exposed, extends past cabinet
- **Flush mount**: Sits level with countertop surface

### Sink Materials

- **Stainless steel**: Most common, 16-18 gauge typical
- **Granite composite**: Quartz + resin, heat/scratch resistant
- **Cast iron**: Enamel-coated, heavy, durable
- **Fireclay**: Ceramic, glossy finish, farmhouse style
- **Copper**: Antimicrobial, develops patina
- **Porcelain**: Classic look, can chip

### Countertop Materials

- **Granite**: Natural stone, each piece unique
- **Quartz**: Engineered stone, consistent pattern
- **Marble**: Soft natural stone, requires sealing
- **Laminate**: Budget-friendly, wide variety
- **Solid surface**: Acrylic-based, seamless joins
- **Butcher block**: Wood, requires maintenance
- **Concrete**: Custom, can be stained
- **Tile**: Individual pieces, grout lines
- **Stainless steel**: Commercial kitchens

### Quote Line Items

- **Product**: The sink itself
- **Labor**: Installation charges (removal, installation, plumbing)
- **Material**: Additional materials (faucet, disposal, mounting hardware)
- **Other**: Miscellaneous charges

## Offline Behavior

The app uses a **local-first** approach:

1. **Data capture**: Measurements and quotes are saved to IndexedDB immediately
2. **Pending sync queue**: Changes are queued for sync with `localId` identifiers
3. **Auto-sync**: When online, pending changes sync automatically
4. **Conflict resolution**: Server timestamp wins; local changes prompt user review

### Sync Flow

```
User Action → IndexedDB → Pending Sync Queue → Online? → API → Update IndexedDB
```

### PWA Features

- **Service Worker**: Caches static assets and API responses
- **Install prompt**: Users can add to home screen
- **Background sync**: Queued operations complete when online
- **Offline indicator**: UI shows connectivity status

## Authentication

- **Access token**: Short-lived (15min), stored in localStorage
- **Refresh token**: Long-lived (7 days), stored in localStorage
- **Token refresh**: Automatic when access token expires
- **Offline auth**: Cached credentials allow offline access

### User Roles

- **admin**: Full access to company settings, user management
- **salesperson**: Can create measurements, quotes, manage own customers

## Database Schema

Key tables and relationships:

```
companies (multi-tenant root)
  └── users (salespeople, admins)
  └── customers (leads and clients)
  └── sinks (product catalog)
  └── measurements (cabinet/countertop data)
  └── quotes
        └── quote_line_items (products, labor, materials)
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://ihms:ihms@localhost:5433/ihms
REDIS_URL=redis://localhost:6380
JWT_SECRET=<generate-secure-key>
JWT_REFRESH_SECRET=<generate-secure-key>
PORT=3011
```

## Demo Company

For development, a demo company is seeded:

- **ID**: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- **Name**: Demo Company
- **Slug**: demo

Register new users with this company ID to test the app.
