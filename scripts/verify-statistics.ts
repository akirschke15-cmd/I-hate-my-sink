import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';
const sql = postgres(DATABASE_URL);

const DEMO_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

async function verifyStatistics() {
  try {
    console.log('=== IHMS Demo Statistics Verification ===\n');

    // Get status breakdown
    const statusStats = await sql`
      SELECT
        status,
        COUNT(*) as count
      FROM quotes
      WHERE company_id = ${DEMO_COMPANY_ID}
      GROUP BY status
      ORDER BY status
    `;

    console.log('Quote Status Breakdown:');
    let total = 0;
    let accepted = 0;
    statusStats.forEach((s: any) => {
      console.log(`- ${s.status}: ${s.count} quotes`);
      total += parseInt(s.count);
      if (s.status === 'accepted') accepted = parseInt(s.count);
    });

    console.log(`\nTotal: ${total} quotes`);
    const conversionRate = total > 0 ? (accepted / total) * 100 : 0;
    console.log(`Conversion Rate: ${conversionRate.toFixed(1)}%`);

    // Calculate average days to close for accepted quotes
    const daysToClose = await sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (signed_at - created_at)) / 86400) as avg_days
      FROM quotes
      WHERE company_id = ${DEMO_COMPANY_ID}
        AND status = 'accepted'
        AND signed_at IS NOT NULL
    `;

    if (daysToClose[0]?.avg_days) {
      console.log(`Average Days to Close: ${parseFloat(daysToClose[0].avg_days).toFixed(2)} days`);
    }

    // Get rep distribution
    const repStats = await sql`
      SELECT
        u.email,
        u.first_name,
        u.last_name,
        COUNT(q.id) as quote_count,
        SUM(CASE WHEN q.status = 'accepted' THEN 1 ELSE 0 END) as accepted_count
      FROM users u
      LEFT JOIN quotes q ON q.created_by_id = u.id AND q.company_id = ${DEMO_COMPANY_ID}
      WHERE u.company_id = ${DEMO_COMPANY_ID}
        AND u.email IN ('admin@ihms.demo', 'sales1@ihms.demo', 'sales2@ihms.demo')
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY u.email
    `;

    console.log('\nQuotes per Sales Rep:');
    repStats.forEach((rep: any) => {
      const repConversionRate = parseInt(rep.quote_count) > 0
        ? (parseInt(rep.accepted_count) / parseInt(rep.quote_count)) * 100
        : 0;
      console.log(
        `- ${rep.first_name} ${rep.last_name} (${rep.email}): ` +
        `${rep.quote_count} quotes, ${rep.accepted_count} accepted (${repConversionRate.toFixed(1)}%)`
      );
    });

    // Get date range
    const dateRange = await sql`
      SELECT
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM quotes
      WHERE company_id = ${DEMO_COMPANY_ID}
    `;

    if (dateRange[0]?.earliest && dateRange[0]?.latest) {
      const earliest = new Date(dateRange[0].earliest);
      const latest = new Date(dateRange[0].latest);
      const daysDiff = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`\nDate Range: ${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()} (${daysDiff} days)`);
    }

    // Get total revenue
    const revenue = await sql`
      SELECT
        SUM(total::numeric) as total_revenue,
        SUM(CASE WHEN status = 'accepted' THEN total::numeric ELSE 0 END) as accepted_revenue
      FROM quotes
      WHERE company_id = ${DEMO_COMPANY_ID}
    `;

    if (revenue[0]?.total_revenue) {
      console.log(`\nTotal Quote Value: $${parseFloat(revenue[0].total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`Accepted Revenue: $${parseFloat(revenue[0].accepted_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    console.log('\n=== Verification Complete ===');

  } catch (error) {
    console.error('Error verifying statistics:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

verifyStatistics();
