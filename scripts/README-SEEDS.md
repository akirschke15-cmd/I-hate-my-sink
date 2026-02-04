# Database Seeding Scripts

This directory contains scripts to populate the database with demo data for testing and development.

## Scripts Overview

### 1. `seed-demo-user.ts`
Creates the demo company and the initial admin user.

**Creates:**
- Demo Company (ID: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
- Admin user: `demo@example.com` / `Password123`

**Run with:**
```bash
pnpm db:seed:user
```

### 2. `seed-demo-sinks.ts`
Populates the product catalog with 18 demo sinks across different materials and mounting styles.

**Creates:**
- 18 sinks (stainless steel, granite composite, fireclay, cast iron, copper, porcelain)
- Various mounting styles (undermount, drop-in, farmhouse, flush mount)
- Price range from $199 to $1,299

**Run with:**
```bash
pnpm db:seed:sinks
```

### 3. `seed-demo-users-rbac.ts` (NEW)
Creates demo users with role-based access control, including customers, measurements, and quotes for testing RBAC functionality.

**Creates:**
- 3 demo users (1 admin, 2 salespeople)
- 6 customers (3 per salesperson)
- 6 measurements (1 per customer)
- 8 quotes with line items (4 per salesperson)

**Demo Users:**

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@ihms.demo | Admin123! | admin | Full access to all company data |
| sales1@ihms.demo | Sales123! | salesperson | Only Mike Johnson's customers/quotes |
| sales2@ihms.demo | Sales123! | salesperson | Only Sarah Williams's customers/quotes |

**Run with:**
```bash
pnpm db:seed:rbac
```

## Usage

### Full Database Setup (Recommended)

Run all seed scripts in order:

```bash
pnpm db:seed:all
```

This will:
1. Create the demo company and initial admin user
2. Populate the sink catalog
3. Create RBAC demo users with test data

### Individual Scripts

Run scripts individually if you only need specific data:

```bash
# Just the company and initial admin
pnpm db:seed:user

# Just the sink catalog
pnpm db:seed:sinks

# Just the RBAC test users and data
pnpm db:seed:rbac
```

## Testing Role-Based Access Control

After running `pnpm db:seed:rbac`, you can test RBAC by logging in as different users:

### As Admin (`admin@ihms.demo`)
- Should see ALL customers (6 total)
- Should see ALL quotes (8 total)
- Can access all salespeople's data

### As Salesperson 1 (`sales1@ihms.demo` - Mike Johnson)
- Should see only Mike's customers (3):
  - Robert Anderson
  - Jennifer Martinez
  - David Thompson
- Should see only Mike's quotes (4 total: 2 draft, 2 sent)

### As Salesperson 2 (`sales2@ihms.demo` - Sarah Williams)
- Should see only Sarah's customers (3):
  - Emily Chen
  - Michael Davis
  - Lisa Rodriguez
- Should see only Sarah's quotes (4 total: 1 accepted, 1 viewed, 2 draft)

## Quote Status Breakdown

The seed script creates quotes with different statuses to test filtering and workflow:

**Mike's Quotes:**
- 2 draft quotes
- 2 sent quotes

**Sarah's Quotes:**
- 1 accepted quote (with emailed_at timestamp)
- 1 viewed quote (with emailed_at timestamp)
- 2 draft quotes

## Data Relationships

```
Demo Company
├── Users (4 total)
│   ├── demo@example.com (admin)
│   ├── admin@ihms.demo (admin)
│   ├── sales1@ihms.demo (salesperson - Mike)
│   └── sales2@ihms.demo (salesperson - Sarah)
│
├── Sinks (18 products)
│
├── Customers (6 total)
│   ├── Mike's Customers (3)
│   │   ├── Robert Anderson
│   │   ├── Jennifer Martinez
│   │   └── David Thompson
│   └── Sarah's Customers (3)
│       ├── Emily Chen
│       ├── Michael Davis
│       └── Lisa Rodriguez
│
├── Measurements (6 total, 1 per customer)
│
└── Quotes (8 total)
    ├── Mike's Quotes (4)
    │   └── Line Items (8 - 2 per quote: product + labor)
    └── Sarah's Quotes (4)
        └── Line Items (8 - 2 per quote: product + labor)
```

## Resetting Data

To re-seed the RBAC data:

```bash
# Delete and recreate RBAC users and their data
pnpm db:seed:rbac
```

The script will skip creating users that already exist and notify you.

To completely reset all demo data:

```bash
# Drop and recreate the database, then run migrations and seeds
pnpm db:push  # or pnpm db:migrate
pnpm db:seed:all
```

## Notes

- The script uses bcryptjs to hash passwords with 12 salt rounds (same as production)
- All quotes include Texas sales tax (8.25%) in calculations
- Quote validity is set to 30 days from creation
- Customer addresses use realistic Texas locations
- Measurements vary between customers (different cabinet sizes, countertop materials, mounting styles)
- The script is idempotent for users (won't recreate existing users)
