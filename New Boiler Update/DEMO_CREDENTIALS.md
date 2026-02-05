# IHMS Demo Credentials

## Quick Start

Run the seed scripts to populate demo data:

```bash
# 1. Create base demo company and user
pnpm tsx scripts/seed-demo-user.ts

# 2. Add sink catalog
pnpm tsx scripts/seed-demo-sinks.ts

# 3. Add RBAC users with customers and quotes
pnpm tsx scripts/seed-demo-users-rbac.ts
```

---

## Demo Accounts

### Basic Demo Account
| Field | Value |
|-------|-------|
| **Email** | `demo@example.com` |
| **Password** | `Password123` |
| **Role** | Admin |
| **Company** | Demo Company |

---

### RBAC Demo Accounts

#### Admin User
| Field | Value |
|-------|-------|
| **Email** | `admin@ihms.demo` |
| **Password** | `Admin123!` |
| **Role** | Admin |
| **Access** | All customers, all quotes |

#### Salesperson 1 - Mike Johnson
| Field | Value |
|-------|-------|
| **Email** | `sales1@ihms.demo` |
| **Password** | `Sales123!` |
| **Role** | Salesperson |
| **Access** | Only Mike's assigned customers/quotes |

#### Salesperson 2 - Sarah Williams
| Field | Value |
|-------|-------|
| **Email** | `sales2@ihms.demo` |
| **Password** | `Sales123!` |
| **Role** | Salesperson |
| **Access** | Only Sarah's assigned customers/quotes |

---

## Testing RBAC

1. **Log in as `admin@ihms.demo`**
   - Can see ALL customers across the company
   - Can see ALL quotes across the company
   - Can assign customers to any salesperson

2. **Log in as `sales1@ihms.demo` (Mike)**
   - Can only see customers assigned to Mike
   - Can only see quotes for Mike's customers
   - Cannot see Sarah's customers or quotes

3. **Log in as `sales2@ihms.demo` (Sarah)**
   - Can only see customers assigned to Sarah
   - Can only see quotes for Sarah's customers
   - Cannot see Mike's customers or quotes

---

## Database Connection

| Field | Value |
|-------|-------|
| **Host** | localhost |
| **Port** | 5433 |
| **Database** | ihms |
| **Username** | ihms |
| **Password** | ihms |

**Connection String**:
```
postgresql://ihms:ihms@localhost:5433/ihms
```

---

## Development Server URLs

| Service | URL |
|---------|-----|
| **Frontend (Vite)** | http://localhost:3010 |
| **Backend (tRPC)** | http://localhost:3011/trpc |
| **Database Studio** | Run `pnpm db:studio` |

---

## Company ID (for API testing)

```
Demo Company ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
```
