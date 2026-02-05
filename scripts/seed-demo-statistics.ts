import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';
const sql = postgres(DATABASE_URL);

const DEMO_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Configuration for demo statistics
const TOTAL_QUOTES = 200;
const CONVERSION_RATE = 0.58; // 58%
const ACCEPTED_QUOTES = Math.round(TOTAL_QUOTES * CONVERSION_RATE); // 116
const AVG_DAYS_TO_CLOSE = 1.23;
const TIME_PERIOD_DAYS = 90; // Last 3 months

// Sales rep emails
const SALES_REPS = ['admin@ihms.demo', 'sales1@ihms.demo', 'sales2@ihms.demo'];

// Quote status distribution (remaining 84 quotes)
// accepted: 116
// sent: 30
// viewed: 25
// draft: 20
// expired: 9
const STATUS_DISTRIBUTION = {
  accepted: ACCEPTED_QUOTES,
  sent: 30,
  viewed: 25,
  draft: 20,
  expired: 9,
};

// Realistic customer data pool
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
];

const CITIES = [
  { city: 'Austin', state: 'TX', zips: ['78701', '78702', '78703', '78704', '78705'] },
  { city: 'Dallas', state: 'TX', zips: ['75201', '75202', '75203', '75204', '75205'] },
  { city: 'Houston', state: 'TX', zips: ['77001', '77002', '77003', '77004', '77005'] },
  { city: 'San Antonio', state: 'TX', zips: ['78201', '78202', '78203', '78204', '78205'] },
  { city: 'Fort Worth', state: 'TX', zips: ['76101', '76102', '76103', '76104', '76105'] },
  { city: 'Plano', state: 'TX', zips: ['75024', '75025', '75026', '75074', '75075'] },
  { city: 'Arlington', state: 'TX', zips: ['76001', '76002', '76010', '76011', '76012'] },
  { city: 'Frisco', state: 'TX', zips: ['75033', '75034', '75035', '75036', '75037'] },
];

const STREET_PREFIXES = ['Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Birch', 'Willow', 'Cherry'];
const STREET_TYPES = ['Street', 'Avenue', 'Road', 'Lane', 'Drive', 'Court', 'Boulevard', 'Way'];

const COUNTERTOP_MATERIALS = ['granite', 'quartz', 'marble', 'laminate', 'solid_surface'];
const MOUNTING_STYLES = ['undermount', 'drop_in', 'farmhouse'];

// Utility functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['email.com', 'mail.com', 'inbox.com', 'example.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
}

function generatePhone(): string {
  return `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function generateAddress() {
  const location = randomElement(CITIES);
  const streetNumber = randomInt(100, 9999);
  const streetName = `${randomElement(STREET_PREFIXES)} ${randomElement(STREET_TYPES)}`;

  return {
    street: `${streetNumber} ${streetName}`,
    city: location.city,
    state: location.state,
    zip: randomElement(location.zips),
    country: 'USA',
  };
}

function generateDateInRange(startDaysAgo: number, endDaysAgo: number): Date {
  const now = Date.now();
  const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
  const end = now - endDaysAgo * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (end - start));
}

function generateDaysToClose(): number {
  // Generate realistic days to close with average of 1.23 days
  // Use a distribution that varies between 0-3 days with concentration around 1-2 days
  const random = Math.random();
  if (random < 0.4) return Math.random() * 1; // 0-1 days (40%)
  if (random < 0.75) return 1 + Math.random() * 1; // 1-2 days (35%)
  if (random < 0.95) return 2 + Math.random() * 1; // 2-3 days (20%)
  return 3 + Math.random() * 1; // 3-4 days (5%)
}

async function clearExistingData(clearAll: boolean) {
  if (clearAll) {
    console.log('Clearing existing demo data...');

    // Delete in correct order due to foreign key constraints
    await sql`DELETE FROM quote_line_items WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = ${DEMO_COMPANY_ID})`;
    await sql`DELETE FROM quotes WHERE company_id = ${DEMO_COMPANY_ID}`;
    await sql`DELETE FROM measurements WHERE company_id = ${DEMO_COMPANY_ID}`;
    await sql`DELETE FROM customers WHERE company_id = ${DEMO_COMPANY_ID} AND email NOT LIKE '%@ihms.demo'`;

    console.log('✓ Existing demo data cleared\n');
  }
}

async function getSalesReps() {
  const reps: any[] = [];

  for (const email of SALES_REPS) {
    const result = await sql`
      SELECT id, email, first_name, last_name
      FROM users
      WHERE email = ${email} AND company_id = ${DEMO_COMPANY_ID}
    `;

    if (result.length > 0) {
      reps.push(result[0]);
    } else {
      console.error(`Sales rep ${email} not found!`);
    }
  }

  return reps;
}

async function getSinks() {
  const sinks = await sql`
    SELECT id, sku, name, base_price, labor_cost, material, mounting_style
    FROM sinks
    WHERE company_id = ${DEMO_COMPANY_ID} AND is_active = true
    ORDER BY sku
  `;

  if (sinks.length === 0) {
    throw new Error('No sinks found. Please run db:seed:sinks first.');
  }

  return sinks;
}

async function createCustomer(repId: string) {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const address = generateAddress();

  const result = await sql`
    INSERT INTO customers (
      company_id,
      assigned_user_id,
      first_name,
      last_name,
      email,
      phone,
      address,
      notes
    ) VALUES (
      ${DEMO_COMPANY_ID},
      ${repId},
      ${firstName},
      ${lastName},
      ${generateEmail(firstName, lastName)},
      ${generatePhone()},
      ${JSON.stringify(address)},
      ${'Kitchen remodel project'}
    )
    RETURNING id
  `;

  return result[0].id;
}

async function createMeasurement(customerId: string, repId: string) {
  const result = await sql`
    INSERT INTO measurements (
      company_id,
      customer_id,
      created_by_id,
      cabinet_width_inches,
      cabinet_depth_inches,
      cabinet_height_inches,
      countertop_material,
      countertop_thickness_inches,
      mounting_style,
      faucet_hole_count,
      location
    ) VALUES (
      ${DEMO_COMPANY_ID},
      ${customerId},
      ${repId},
      ${randomInt(30, 42)},
      ${randomInt(22, 26)},
      ${randomInt(34, 38)},
      ${randomElement(COUNTERTOP_MATERIALS)},
      ${1.25 + Math.random() * 0.75},
      ${randomElement(MOUNTING_STYLES)},
      ${randomInt(1, 4)},
      ${'Kitchen'}
    )
    RETURNING id
  `;

  return result[0].id;
}

async function createQuote(
  customerId: string,
  measurementId: string,
  repId: string,
  status: string,
  sink: any,
  quoteNumber: string,
  createdAt: Date,
  acceptedAt: Date | null
) {
  const sinkPrice = parseFloat(sink.base_price);
  const laborCost = parseFloat(sink.labor_cost);
  const subtotal = sinkPrice + laborCost;
  const taxRate = 0.0825; // 8.25% Texas sales tax
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  // Determine valid_until based on status
  const validUntil = status === 'expired'
    ? new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days (expired)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Email tracking
  const emailedAt = ['sent', 'viewed', 'accepted', 'expired'].includes(status)
    ? new Date(createdAt.getTime() + randomInt(1, 6) * 60 * 60 * 1000) // 1-6 hours after creation
    : null;

  const emailCount = emailedAt ? randomInt(1, 3) : 0;

  // Signed at (for accepted quotes)
  const signedAt = status === 'accepted' ? acceptedAt : null;

  const result = await sql`
    INSERT INTO quotes (
      company_id,
      customer_id,
      measurement_id,
      created_by_id,
      quote_number,
      status,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      valid_until,
      emailed_at,
      email_count,
      signed_at,
      created_at,
      updated_at
    ) VALUES (
      ${DEMO_COMPANY_ID},
      ${customerId},
      ${measurementId},
      ${repId},
      ${quoteNumber},
      ${status},
      ${subtotal.toFixed(2)},
      ${taxRate.toFixed(4)},
      ${taxAmount.toFixed(2)},
      ${total.toFixed(2)},
      ${validUntil.toISOString()},
      ${emailedAt?.toISOString() || null},
      ${emailCount},
      ${signedAt?.toISOString() || null},
      ${createdAt.toISOString()},
      ${createdAt.toISOString()}
    )
    RETURNING id
  `;

  return result[0].id;
}

async function createLineItems(quoteId: string, sink: any) {
  // Product line item
  await sql`
    INSERT INTO quote_line_items (
      quote_id,
      sink_id,
      type,
      name,
      description,
      sku,
      quantity,
      unit_price,
      line_total,
      sort_order
    ) VALUES (
      ${quoteId},
      ${sink.id},
      ${'product'},
      ${sink.name},
      ${'Premium quality sink'},
      ${sink.sku},
      ${1},
      ${sink.base_price},
      ${sink.base_price},
      ${0}
    )
  `;

  // Labor line item
  await sql`
    INSERT INTO quote_line_items (
      quote_id,
      type,
      name,
      description,
      quantity,
      unit_price,
      line_total,
      sort_order
    ) VALUES (
      ${quoteId},
      ${'labor'},
      ${'Installation Labor'},
      ${'Professional sink installation including removal of old sink, plumbing connections, and cleanup'},
      ${1},
      ${sink.labor_cost},
      ${sink.labor_cost},
      ${1}
    )
  `;
}

async function seedDemoStatistics(clearAll: boolean = false) {
  try {
    console.log('=== IHMS Demo Statistics Seeding ===\n');
    console.log('Target Statistics:');
    console.log(`- Total Quotes: ${TOTAL_QUOTES}`);
    console.log(`- Conversion Rate: ${(CONVERSION_RATE * 100).toFixed(1)}%`);
    console.log(`- Accepted Quotes: ${ACCEPTED_QUOTES}`);
    console.log(`- Average Days to Close: ${AVG_DAYS_TO_CLOSE} days`);
    console.log(`- Time Period: Last ${TIME_PERIOD_DAYS} days\n`);

    // Clear existing data if requested
    await clearExistingData(clearAll);

    // Get sales reps
    console.log('Loading sales representatives...');
    const salesReps = await getSalesReps();

    if (salesReps.length === 0) {
      throw new Error('No sales reps found. Please run db:seed:rbac first.');
    }

    console.log(`✓ Found ${salesReps.length} sales reps\n`);

    // Get sinks
    console.log('Loading sink products...');
    const sinks = await getSinks();
    console.log(`✓ Found ${sinks.length} sink products\n`);

    // Generate quotes with proper distribution
    console.log('Generating demo quotes...\n');

    const statuses = Object.entries(STATUS_DISTRIBUTION).flatMap(([status, count]) =>
      Array(count).fill(status)
    );

    // Shuffle statuses for random distribution
    for (let i = statuses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
    }

    let totalDaysToClose = 0;
    let acceptedCount = 0;
    const repQuoteCounts: Record<string, number> = {};

    for (let i = 0; i < TOTAL_QUOTES; i++) {
      // Distribute quotes somewhat evenly across reps
      const rep = salesReps[i % salesReps.length];
      repQuoteCounts[rep.email] = (repQuoteCounts[rep.email] || 0) + 1;

      // Create customer
      const customerId = await createCustomer(rep.id);

      // Create measurement
      const measurementId = await createMeasurement(customerId, rep.id);

      // Select random sink
      const sink = randomElement(sinks);

      // Generate quote number
      const quoteNumber = `Q-${Date.now()}-${String(i).padStart(4, '0')}`;

      // Generate creation date spread over last 90 days
      const createdAt = generateDateInRange(TIME_PERIOD_DAYS, 0);

      // Get status for this quote
      const status = statuses[i];

      // For accepted quotes, calculate accepted_at based on days to close
      let acceptedAt = null;
      if (status === 'accepted') {
        const daysToClose = generateDaysToClose();
        totalDaysToClose += daysToClose;
        acceptedCount++;
        acceptedAt = new Date(createdAt.getTime() + daysToClose * 24 * 60 * 60 * 1000);
      }

      // Create quote
      const quoteId = await createQuote(
        customerId,
        measurementId,
        rep.id,
        status,
        sink,
        quoteNumber,
        createdAt,
        acceptedAt
      );

      // Create line items
      await createLineItems(quoteId, sink);

      // Progress indicator
      if ((i + 1) % 20 === 0) {
        console.log(`  Created ${i + 1}/${TOTAL_QUOTES} quotes...`);
      }
    }

    console.log(`  Created ${TOTAL_QUOTES}/${TOTAL_QUOTES} quotes ✓\n`);

    // Calculate actual statistics
    const actualAvgDaysToClose = acceptedCount > 0 ? totalDaysToClose / acceptedCount : 0;

    // Query final statistics from database
    const stats = await sql`
      SELECT
        COUNT(*) as total_quotes,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotes,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_quotes,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_quotes,
        SUM(CASE WHEN status = 'viewed' THEN 1 ELSE 0 END) as viewed_quotes,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_quotes,
        SUM(total::numeric) as total_revenue
      FROM quotes
      WHERE company_id = ${DEMO_COMPANY_ID}
    `;

    const totalQuotes = parseInt(stats[0].total_quotes);
    const acceptedQuotes = parseInt(stats[0].accepted_quotes);
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

    console.log('=== Seeding Complete ===\n');
    console.log('Final Statistics:');
    console.log(`- Total Quotes: ${totalQuotes}`);
    console.log(`- Accepted: ${acceptedQuotes} (${conversionRate.toFixed(1)}%)`);
    console.log(`- Draft: ${stats[0].draft_quotes}`);
    console.log(`- Sent: ${stats[0].sent_quotes}`);
    console.log(`- Viewed: ${stats[0].viewed_quotes}`);
    console.log(`- Expired: ${stats[0].expired_quotes}`);
    console.log(`- Average Days to Close: ${actualAvgDaysToClose.toFixed(2)} days`);
    console.log(`- Total Revenue (Accepted): $${parseFloat(stats[0].total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`);

    console.log('Quotes per Sales Rep:');
    for (const [email, count] of Object.entries(repQuoteCounts)) {
      console.log(`- ${email}: ${count} quotes`);
    }

    console.log('\n=== Success! ===');
    console.log('Run the application and log in with any of the following accounts:');
    console.log('- admin@ihms.demo (Admin123!)');
    console.log('- sales1@ihms.demo (Sales123!)');
    console.log('- sales2@ihms.demo (Sales123!)\n');

  } catch (error) {
    console.error('Error seeding demo statistics:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const clearAll = args.includes('--clear') || args.includes('-c');

if (clearAll) {
  console.log('⚠️  Running with --clear flag: existing quotes and customers will be deleted\n');
}

seedDemoStatistics(clearAll);
