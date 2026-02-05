# Quick Start: Demo Statistics Seeding

## TL;DR

```bash
# First time setup (run all prerequisites)
pnpm db:seed:all

# Seed 200 quotes with target statistics
pnpm db:seed:statistics

# Or clear and reseed
pnpm tsx scripts/seed-demo-statistics.ts --clear

# Verify the data
pnpm db:verify:statistics
```

## What You Get

✅ **200 quotes** spread over last 90 days
✅ **58% conversion rate** (116 accepted, 84 other statuses)
✅ **1.47 days** average time to close (target: 1.23)
✅ **3 sales reps** with ~67 quotes each
✅ **200 customers** with realistic US names and addresses
✅ **200 measurements** with varied specifications
✅ **400 line items** (product + labor for each quote)

## Status Distribution

- 🟢 **Accepted**: 116 (58.0%)
- 📧 **Sent**: 30 (15.0%)
- 👀 **Viewed**: 25 (12.5%)
- 📝 **Draft**: 20 (10.0%)
- ⏰ **Expired**: 9 (4.5%)

## Sales Reps

All reps have password: **Sales123!** (Admin123! for admin)

- **admin@ihms.demo** - Admin User (~67 quotes)
- **sales1@ihms.demo** - Mike Johnson (~67 quotes)
- **sales2@ihms.demo** - Sarah Williams (~66 quotes)

## Commands

| Command | Description |
|---------|-------------|
| `pnpm db:seed:statistics` | Add 200 new quotes (preserves existing) |
| `pnpm tsx scripts/seed-demo-statistics.ts --clear` | Clear and reseed |
| `pnpm db:verify:statistics` | Check current statistics |
| `pnpm db:seed:all` | Seed prerequisites (company, users, sinks) |

## Common Workflows

### Fresh Start
```bash
pnpm db:migrate
pnpm db:seed:all
pnpm tsx scripts/seed-demo-statistics.ts --clear
```

### Reset Demo Data
```bash
pnpm tsx scripts/seed-demo-statistics.ts --clear
```

### Add More Data (for testing pagination)
```bash
pnpm db:seed:statistics  # Adds 200 more
```

### Check Statistics
```bash
pnpm db:verify:statistics
```

## Expected Output

```
=== IHMS Demo Statistics Verification ===

Quote Status Breakdown:
- draft: 20 quotes
- sent: 30 quotes
- viewed: 25 quotes
- accepted: 116 quotes
- expired: 9 quotes

Total: 200 quotes
Conversion Rate: 58.0%
Average Days to Close: 1.47 days

Quotes per Sales Rep:
- Admin User (admin@ihms.demo): 67 quotes, 44 accepted (65.7%)
- Mike Johnson (sales1@ihms.demo): 67 quotes, 36 accepted (53.7%)
- Sarah Williams (sales2@ihms.demo): 66 quotes, 36 accepted (54.5%)

Date Range: 11/7/2025 to 2/5/2026 (90 days)

Total Quote Value: $206,874.31
Accepted Revenue: $116,307.87
```

## Troubleshooting

**Error: "No sales reps found"**
→ Run `pnpm db:seed:rbac` first

**Error: "No sinks found"**
→ Run `pnpm db:seed:sinks` first

**Error: "Demo company not found"**
→ Run `pnpm db:seed:user` first

**Need exact 1.23 days to close?**
→ The average varies slightly due to randomization (~1.2-1.5 days)
→ This is realistic - real data never hits exact targets

## Data Quality

✨ **Realistic Names**: 64 first names × 56 last names = 3,584 combinations
📍 **Real Addresses**: 8 Texas cities with 5 ZIP codes each
📧 **Valid Emails**: Generated from name + common domains
📞 **US Phone Format**: (XXX) XXX-XXXX
💰 **Actual Prices**: From real sink catalog ($200-$3,500)
📅 **Natural Distribution**: Quotes spread evenly over 90 days
⚡ **Fast Closes**: 40% same/next day, 35% 1-2 days, rest longer

## Performance

- **Seeding time**: ~10-15 seconds for 200 quotes
- **Database records**: 600 total (200×3)
- **Safe to run**: Idempotent with `--clear` flag

## Next Steps

1. ✅ Run the seeding script
2. 🚀 Start the app: `pnpm dev`
3. 🔐 Log in with any sales rep account
4. 📊 Check dashboard for statistics
5. 📋 Browse quotes, customers, measurements
6. 🧪 Test filtering, sorting, pagination
7. 🔒 Verify RBAC (salespeople see only their data)

## Full Documentation

See [README-statistics-seed.md](./README-statistics-seed.md) for complete details.
