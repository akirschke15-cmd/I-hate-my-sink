import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';
const sql = postgres(DATABASE_URL);

async function seedDemoData() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  try {
    // Create demo company if not exists
    const existingCompany = await sql`
      SELECT id FROM companies WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    `;

    if (existingCompany.length === 0) {
      await sql`
        INSERT INTO companies (id, name, slug, email, is_active)
        VALUES (
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'Demo Company',
          'demo',
          'admin@demo.com',
          true
        )
      `;
      console.log('Demo company created');
    } else {
      console.log('Demo company already exists');
    }

    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE email = 'demo@example.com'`;

    if (existingUser.length > 0) {
      console.log('Demo user already exists');
      await sql.end();
      return;
    }

    // Insert demo user
    const result = await sql`
      INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
      VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'demo@example.com',
        ${passwordHash},
        'Demo',
        'User',
        'admin'
      )
      RETURNING id, email
    `;

    console.log('Demo user created:', result[0]);
    console.log('');
    console.log('=== Demo Credentials ===');
    console.log('Email: demo@example.com');
    console.log('Password: Password123');
    console.log('========================');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

seedDemoData();
