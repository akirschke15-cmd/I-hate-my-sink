# Demo Statistics Seeding Script

## Overview

The `seed-demo-statistics.ts` script generates realistic demo data for the IHMS application with specific target statistics for testing and demonstration purposes.

## Target Statistics

- **Total Quotes**: 200
- **Time Period**: Last 90 days (3 months)
- **Sales Reps**: 3 (admin@ihms.demo, sales1@ihms.demo, sales2@ihms.demo)
- **Conversion Rate**: 58% (116 accepted quotes)
- **Average Days to Close**: 1.23 days

## Quote Status Distribution

- **Accepted**: 116 (58%)
- **Sent**: 30 (15%)
- **Viewed**: 25 (12.5%)
- **Draft**: 20 (10%)
- **Expired**: 9 (4.5%)

## Usage

### Basic Usage (Preserves Existing Data)

```bash
pnpm db:seed:statistics
```

This will create 200 new quotes with associated customers and measurements **without** deleting existing data.

### Clear and Reseed

```bash
pnpm tsx scripts/seed-demo-statistics.ts --clear
```

The `--clear` flag will:
1. Delete all existing quotes and quote line items
2. Delete all existing measurements
3. Delete all existing customers (except demo users)
4. Create fresh demo data

## Prerequisites

Before running this script, ensure the following are already seeded:

1. **Demo Company**: Run `pnpm db:seed:user` first
2. **Sink Products**: Run `pnpm db:seed:sinks` first
3. **Sales Reps**: Run `pnpm db:seed:rbac` first

Or run all prerequisites at once:

```bash
pnpm db:seed:all
```

## What Gets Created

### Customers (200)
- Realistic names from common US first/last names
- Email addresses generated from names
- Phone numbers in US format
- Addresses across 8 Texas cities (Austin, Dallas, Houston, etc.)
- Distributed evenly across 3 sales reps (~66-67 each)

### Measurements (200)
- One measurement per customer
- Realistic cabinet dimensions (30-42" width, 22-26" depth, 34-38" height)
- Various countertop materials (granite, quartz, marble, laminate, solid surface)
- Different mounting styles (undermount, drop-in, farmhouse)
- Faucet hole counts (1-4)

### Quotes (200)
- Unique quote numbers with timestamps
- Created dates spread over last 90 days
- Status distribution matching target (58% accepted, etc.)
- Realistic pricing from sink product catalog
- 8.25% Texas sales tax
- Email tracking for sent/viewed/accepted/expired quotes

### Accepted Quote Details
- `signed_at` timestamp set with realistic days-to-close
- Days to close varies: 0-4 days with average of ~1.23 days
- Distribution weighted toward 1-2 days (most common)
- Some quick closes (0-1 day) and some slower (2-4 days)

### Quote Line Items (400 total, 2 per quote)
1. **Product Line Item**
   - Links to actual sink from catalog
   - Includes SKU, name, description
   - Base price from sink

2. **Labor Line Item**
   - Standard installation labor
   - Labor cost from sink configuration

## Database Connection

Default connection string:
```
postgresql://ihms:ihms@localhost:5433/ihms
```

Override with environment variable:
```bash
DATABASE_URL="postgresql://user:pass@host:port/db" pnpm db:seed:statistics
```

## Output Example

```
=== IHMS Demo Statistics Seeding ===

Target Statistics:
- Total Quotes: 200
- Conversion Rate: 58.0%
- Accepted Quotes: 116
- Average Days to Close: 1.23 days
- Time Period: Last 90 days

Loading sales representatives...
✓ Found 3 sales reps

Loading sink products...
✓ Found 15 sink products

Generating demo quotes...

  Created 20/200 quotes...
  Created 40/200 quotes...
  ...
  Created 200/200 quotes ✓

=== Seeding Complete ===

Final Statistics:
- Total Quotes: 200
- Accepted: 116 (58.0%)
- Draft: 20
- Sent: 30
- Viewed: 25
- Expired: 9
- Average Days to Close: 1.23 days
- Total Revenue (Accepted): $234,567.89

Quotes per Sales Rep:
- admin@ihms.demo: 67 quotes
- sales1@ihms.demo: 67 quotes
- sales2@ihms.demo: 66 quotes

=== Success! ===
```

## Idempotency

The script is **idempotent** when used with the `--clear` flag:
- Running multiple times with `--clear` produces the same final state
- Without `--clear`, it adds new data each time (useful for testing pagination, etc.)

## Data Realism

### Customer Names
- 64 common US first names
- 56 common US last names
- Generated emails based on name combinations

### Addresses
- 8 major Texas cities
- 5 ZIP codes per city (40 total unique ZIPs)
- Realistic street names (Oak Street, Maple Avenue, etc.)

### Dates
- Quote `created_at`: Uniformly distributed over last 90 days
- Quote `emailed_at`: 1-6 hours after creation (for sent/viewed/accepted/expired)
- Quote `signed_at`: Created + days_to_close (for accepted only)
- Days to close distribution:
  - 40%: 0-1 days (same day or next day)
  - 35%: 1-2 days
  - 20%: 2-3 days
  - 5%: 3-4 days
  - Average: ~1.23 days

### Prices
- Realistic sink prices from catalog ($200-$3,500)
- Labor costs ($150-$500)
- Texas sales tax (8.25%)

## Testing Use Cases

This script is perfect for testing:

1. **Dashboard Statistics**
   - Conversion rate calculations
   - Revenue metrics
   - Quote status distribution

2. **Sales Rep Performance**
   - Individual rep statistics
   - Quote distribution across team
   - Days to close metrics

3. **Time-Based Analytics**
   - Quotes over time (last 90 days)
   - Monthly/weekly trends
   - Seasonal patterns

4. **Pagination & Filtering**
   - Large dataset (200 quotes)
   - Multiple status filters
   - Date range queries

5. **RBAC Testing**
   - Salespeople see only their quotes
   - Admins see all quotes
   - Customer assignment validation

## Cleanup

To remove all demo data:

```bash
pnpm tsx scripts/seed-demo-statistics.ts --clear
```

Then run without `--clear` to regenerate:

```bash
pnpm tsx scripts/seed-demo-statistics.ts
```

## Troubleshooting

### Error: "No sales reps found"
**Solution**: Run `pnpm db:seed:rbac` first to create sales rep users

### Error: "No sinks found"
**Solution**: Run `pnpm db:seed:sinks` first to create sink products

### Error: "Demo company not found"
**Solution**: Run `pnpm db:seed:user` first to create demo company

### Error: Database connection failed
**Solution**: Check PostgreSQL is running on localhost:5433 or set DATABASE_URL

## Integration with Development Workflow

### Fresh Database Setup
```bash
# 1. Create tables
pnpm db:migrate

# 2. Seed base data
pnpm db:seed:all

# 3. Seed statistics
pnpm db:seed:statistics
```

### Reset Demo Data
```bash
pnpm tsx scripts/seed-demo-statistics.ts --clear
```

### Add More Demo Data
```bash
pnpm db:seed:statistics  # Adds 200 more quotes
```

## Performance

- Seeding 200 quotes: ~10-15 seconds
- Creates 600 database records total:
  - 200 customers
  - 200 measurements
  - 200 quotes
  - 400 quote line items

## Future Enhancements

Possible improvements:
- [ ] Add `--count` flag to specify number of quotes
- [ ] Add `--conversion-rate` flag to customize conversion rate
- [ ] Add `--days` flag to customize time period
- [ ] Support for quote revisions/versions
- [ ] Add customer interaction history
- [ ] Generate quote comments/notes
- [ ] Add Workiz integration data
- [ ] Generate quote PDFs

## Support

For issues or questions:
1. Check Prerequisites section
2. Review Troubleshooting section
3. Check database connection
4. Verify all previous seed scripts ran successfully
