import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';
const sql = postgres(DATABASE_URL);

const DEMO_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

interface DemoUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'salesperson';
}

interface DemoCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  notes: string;
}

const demoUsers: DemoUser[] = [
  {
    email: 'admin@ihms.demo',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  },
  {
    email: 'sales1@ihms.demo',
    password: 'Sales123!',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'salesperson',
  },
  {
    email: 'sales2@ihms.demo',
    password: 'Sales123!',
    firstName: 'Sarah',
    lastName: 'Williams',
    role: 'salesperson',
  },
];

// Customers for Mike Johnson (sales1)
const mikeCustomers: DemoCustomer[] = [
  {
    firstName: 'Robert',
    lastName: 'Anderson',
    email: 'robert.anderson@email.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Oak Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'USA',
    },
    notes: 'Kitchen remodel - interested in farmhouse sink',
  },
  {
    firstName: 'Jennifer',
    lastName: 'Martinez',
    email: 'jennifer.martinez@email.com',
    phone: '(555) 234-5678',
    address: {
      street: '456 Maple Avenue',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      country: 'USA',
    },
    notes: 'Replacing old drop-in sink, prefers stainless steel',
  },
  {
    firstName: 'David',
    lastName: 'Thompson',
    email: 'david.thompson@email.com',
    phone: '(555) 345-6789',
    address: {
      street: '789 Pine Road',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      country: 'USA',
    },
    notes: 'New construction - looking for undermount granite composite',
  },
];

// Customers for Sarah Williams (sales2)
const sarahCustomers: DemoCustomer[] = [
  {
    firstName: 'Emily',
    lastName: 'Chen',
    email: 'emily.chen@email.com',
    phone: '(555) 456-7890',
    address: {
      street: '321 Birch Lane',
      city: 'San Antonio',
      state: 'TX',
      zip: '78201',
      country: 'USA',
    },
    notes: 'High-end kitchen renovation - interested in copper sink',
  },
  {
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.davis@email.com',
    phone: '(555) 567-8901',
    address: {
      street: '654 Cedar Court',
      city: 'Fort Worth',
      state: 'TX',
      zip: '76101',
      country: 'USA',
    },
    notes: 'Bar sink installation - small space requirements',
  },
  {
    firstName: 'Lisa',
    lastName: 'Rodriguez',
    email: 'lisa.rodriguez@email.com',
    phone: '(555) 678-9012',
    address: {
      street: '987 Elm Boulevard',
      city: 'Plano',
      state: 'TX',
      zip: '75024',
      country: 'USA',
    },
    notes: 'Replacing cast iron sink with modern undermount',
  },
];

async function seedDemoUsersAndData() {
  try {
    // Check if company exists
    const company = await sql`
      SELECT id FROM companies WHERE id = ${DEMO_COMPANY_ID}
    `;

    if (company.length === 0) {
      console.error('Demo company not found. Please run seed-demo-user.ts first.');
      await sql.end();
      process.exit(1);
    }

    console.log('Starting RBAC demo data seed...\n');

    // Create demo users
    const userIds: Record<string, string> = {};

    for (const user of demoUsers) {
      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${user.email}
      `;

      if (existingUser.length > 0) {
        console.log(`User ${user.email} already exists, skipping...`);
        userIds[user.email] = existingUser[0].id;
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 12);

      const result = await sql`
        INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
        VALUES (
          ${DEMO_COMPANY_ID},
          ${user.email},
          ${passwordHash},
          ${user.firstName},
          ${user.lastName},
          ${user.role}
        )
        RETURNING id
      `;

      userIds[user.email] = result[0].id;
      console.log(`✓ Created ${user.role}: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    console.log('');

    // Get sink IDs for quotes
    const sinks = await sql`
      SELECT id, sku, name, base_price, labor_cost
      FROM sinks
      WHERE company_id = ${DEMO_COMPANY_ID}
      ORDER BY sku
      LIMIT 10
    `;

    if (sinks.length === 0) {
      console.log('No sinks found. Please run seed-demo-sinks.ts first.');
      console.log('Skipping customer and quote creation.');
      await sql.end();
      return;
    }

    // Create customers and quotes for Mike Johnson (sales1)
    console.log('Creating customers and quotes for Mike Johnson...');
    const mikeUserId = userIds['sales1@ihms.demo'];

    for (let i = 0; i < mikeCustomers.length; i++) {
      const customer = mikeCustomers[i];

      // Create customer
      const customerResult = await sql`
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
          ${mikeUserId},
          ${customer.firstName},
          ${customer.lastName},
          ${customer.email},
          ${customer.phone},
          ${JSON.stringify(customer.address)},
          ${customer.notes}
        )
        RETURNING id
      `;

      const customerId = customerResult[0].id;
      console.log(`  ✓ Customer: ${customer.firstName} ${customer.lastName}`);

      // Create measurement for this customer
      const measurementResult = await sql`
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
          ${mikeUserId},
          ${33 + i},
          ${24},
          ${36},
          ${'granite'},
          ${1.5},
          ${i === 0 ? 'farmhouse' : i === 1 ? 'drop_in' : 'undermount'},
          ${3},
          ${'Kitchen'}
        )
        RETURNING id
      `;

      const measurementId = measurementResult[0].id;

      // Create 1-2 quotes per customer (more quotes for first customer)
      const quotesToCreate = i === 0 ? 2 : 1;

      for (let q = 0; q < quotesToCreate; q++) {
        const sink = sinks[i * 2 + q];
        const quoteNumber = `Q-${Date.now()}-${i}${q}`;
        const status = q === 0 ? 'draft' : 'sent';

        // Calculate totals
        const sinkPrice = parseFloat(sink.base_price);
        const laborCost = parseFloat(sink.labor_cost);
        const subtotal = sinkPrice + laborCost;
        const taxRate = 0.0825; // 8.25% Texas sales tax
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;

        // Create quote
        const quoteResult = await sql`
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
            valid_until
          ) VALUES (
            ${DEMO_COMPANY_ID},
            ${customerId},
            ${measurementId},
            ${mikeUserId},
            ${quoteNumber},
            ${status},
            ${subtotal.toFixed(2)},
            ${taxRate.toFixed(4)},
            ${taxAmount.toFixed(2)},
            ${total.toFixed(2)},
            ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
          )
          RETURNING id
        `;

        const quoteId = quoteResult[0].id;

        // Create line items for the quote
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

        console.log(`    ✓ Quote ${quoteNumber} (${status}) - $${total.toFixed(2)}`);
      }
    }

    console.log('');

    // Create customers and quotes for Sarah Williams (sales2)
    console.log('Creating customers and quotes for Sarah Williams...');
    const sarahUserId = userIds['sales2@ihms.demo'];

    for (let i = 0; i < sarahCustomers.length; i++) {
      const customer = sarahCustomers[i];

      // Create customer
      const customerResult = await sql`
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
          ${sarahUserId},
          ${customer.firstName},
          ${customer.lastName},
          ${customer.email},
          ${customer.phone},
          ${JSON.stringify(customer.address)},
          ${customer.notes}
        )
        RETURNING id
      `;

      const customerId = customerResult[0].id;
      console.log(`  ✓ Customer: ${customer.firstName} ${customer.lastName}`);

      // Create measurement for this customer
      const measurementResult = await sql`
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
          ${sarahUserId},
          ${30 + i * 2},
          ${22},
          ${34.5},
          ${i === 0 ? 'quartz' : i === 1 ? 'marble' : 'laminate'},
          ${i === 1 ? 2.0 : 1.25},
          ${i === 0 ? 'undermount' : i === 1 ? 'drop_in' : 'undermount'},
          ${i === 1 ? 1 : 3},
          ${i === 1 ? 'Bar' : 'Kitchen'}
        )
        RETURNING id
      `;

      const measurementId = measurementResult[0].id;

      // Create 1-2 quotes per customer (more quotes for first customer)
      const quotesToCreate = i === 0 ? 2 : 1;

      for (let q = 0; q < quotesToCreate; q++) {
        const sink = sinks[3 + i * 2 + q];
        const quoteNumber = `Q-${Date.now()}-S${i}${q}`;
        const status = q === 0 && i === 0 ? 'accepted' : i === 1 ? 'viewed' : 'draft';

        // Calculate totals
        const sinkPrice = parseFloat(sink.base_price);
        const laborCost = parseFloat(sink.labor_cost);
        const subtotal = sinkPrice + laborCost;
        const taxRate = 0.0825; // 8.25% Texas sales tax
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;

        // Create quote
        const quoteResult = await sql`
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
            email_count
          ) VALUES (
            ${DEMO_COMPANY_ID},
            ${customerId},
            ${measurementId},
            ${sarahUserId},
            ${quoteNumber},
            ${status},
            ${subtotal.toFixed(2)},
            ${taxRate.toFixed(4)},
            ${taxAmount.toFixed(2)},
            ${total.toFixed(2)},
            ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()},
            ${status !== 'draft' ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() : null},
            ${status !== 'draft' ? 1 : 0}
          )
          RETURNING id
        `;

        const quoteId = quoteResult[0].id;

        // Create line items for the quote
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

        console.log(`    ✓ Quote ${quoteNumber} (${status}) - $${total.toFixed(2)}`);
      }
    }

    console.log('');
    console.log('=== RBAC Demo Data Seeded Successfully ===');
    console.log('');
    console.log('Demo Users Created:');
    console.log('');
    console.log('1. Admin User:');
    console.log('   Email: admin@ihms.demo');
    console.log('   Password: Admin123!');
    console.log('   Role: admin');
    console.log('   Access: Full access to all company data');
    console.log('');
    console.log('2. Salesperson - Mike Johnson:');
    console.log('   Email: sales1@ihms.demo');
    console.log('   Password: Sales123!');
    console.log('   Role: salesperson');
    console.log(`   Customers: ${mikeCustomers.length}`);
    console.log('   Quotes: 4 (2 draft, 2 sent)');
    console.log('');
    console.log('3. Salesperson - Sarah Williams:');
    console.log('   Email: sales2@ihms.demo');
    console.log('   Password: Sales123!');
    console.log('   Role: salesperson');
    console.log(`   Customers: ${sarahCustomers.length}`);
    console.log('   Quotes: 4 (1 accepted, 1 viewed, 2 draft)');
    console.log('');
    console.log('Testing Instructions:');
    console.log('- Log in as admin@ihms.demo to see ALL customers and quotes');
    console.log('- Log in as sales1@ihms.demo to see only Mike\'s customers and quotes');
    console.log('- Log in as sales2@ihms.demo to see only Sarah\'s customers and quotes');
    console.log('');
    console.log('This verifies role-based access control is working correctly.');
    console.log('==========================================');
  } catch (error) {
    console.error('Error seeding RBAC demo data:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedDemoUsersAndData();
