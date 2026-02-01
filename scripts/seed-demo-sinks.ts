import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ihms:ihms@localhost:5433/ihms';
const sql = postgres(DATABASE_URL);

const DEMO_COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

interface SinkData {
  sku: string;
  name: string;
  description: string;
  material: string;
  mountingStyle: string;
  widthInches: string;
  depthInches: string;
  heightInches: string;
  bowlCount: number;
  basePrice: string;
  laborCost: string;
  imageUrl: string | null;
}

const demoSinks: SinkData[] = [
  // Stainless Steel Sinks
  {
    sku: 'SS-UM-3218',
    name: 'ProChef Undermount 32"',
    description: 'Professional-grade 16-gauge stainless steel undermount sink with sound dampening pads and rear drain placement for maximum usable space.',
    material: 'stainless_steel',
    mountingStyle: 'undermount',
    widthInches: '32.00',
    depthInches: '18.00',
    heightInches: '10.00',
    bowlCount: 1,
    basePrice: '349.99',
    laborCost: '275.00',
    imageUrl: null,
  },
  {
    sku: 'SS-UM-3322-DB',
    name: 'ProChef Double Bowl 33"',
    description: 'Large 33" double-bowl undermount sink with 60/40 split. 18-gauge stainless steel with commercial-grade brushed finish.',
    material: 'stainless_steel',
    mountingStyle: 'undermount',
    widthInches: '33.00',
    depthInches: '22.00',
    heightInches: '9.00',
    bowlCount: 2,
    basePrice: '449.99',
    laborCost: '325.00',
    imageUrl: null,
  },
  {
    sku: 'SS-DI-2522',
    name: 'Classic Drop-In 25"',
    description: 'Versatile 25" drop-in sink perfect for standard cabinet sizes. Easy installation with self-rimming design.',
    material: 'stainless_steel',
    mountingStyle: 'drop_in',
    widthInches: '25.00',
    depthInches: '22.00',
    heightInches: '8.00',
    bowlCount: 1,
    basePrice: '199.99',
    laborCost: '175.00',
    imageUrl: null,
  },
  {
    sku: 'SS-DI-3322-DB',
    name: 'Classic Double Drop-In 33"',
    description: 'Traditional 33" double-bowl drop-in with equal 50/50 split. Perfect for kitchens needing separate prep and wash areas.',
    material: 'stainless_steel',
    mountingStyle: 'drop_in',
    widthInches: '33.00',
    depthInches: '22.00',
    heightInches: '8.00',
    bowlCount: 2,
    basePrice: '279.99',
    laborCost: '200.00',
    imageUrl: null,
  },

  // Granite Composite Sinks
  {
    sku: 'GC-UM-3018-BLK',
    name: 'Stone Black Undermount 30"',
    description: 'Sleek black granite composite undermount sink. Highly resistant to scratches, stains, and heat up to 536°F.',
    material: 'granite_composite',
    mountingStyle: 'undermount',
    widthInches: '30.00',
    depthInches: '18.00',
    heightInches: '9.50',
    bowlCount: 1,
    basePrice: '429.99',
    laborCost: '300.00',
    imageUrl: null,
  },
  {
    sku: 'GC-UM-3219-WHT',
    name: 'Stone White Undermount 32"',
    description: 'Elegant white granite composite sink with modern rectangular profile. Non-porous surface resists bacterial growth.',
    material: 'granite_composite',
    mountingStyle: 'undermount',
    widthInches: '32.00',
    depthInches: '19.00',
    heightInches: '9.00',
    bowlCount: 1,
    basePrice: '459.99',
    laborCost: '300.00',
    imageUrl: null,
  },
  {
    sku: 'GC-DI-3320-GRY',
    name: 'Stone Gray Double Bowl 33"',
    description: 'Stylish gray granite composite with low-divide double bowl design. Perfect balance of functionality and aesthetics.',
    material: 'granite_composite',
    mountingStyle: 'drop_in',
    widthInches: '33.00',
    depthInches: '20.00',
    heightInches: '9.00',
    bowlCount: 2,
    basePrice: '519.99',
    laborCost: '275.00',
    imageUrl: null,
  },

  // Farmhouse/Apron Front Sinks
  {
    sku: 'FC-FH-3018',
    name: 'Heritage Fireclay Farmhouse 30"',
    description: 'Handcrafted fireclay farmhouse sink with classic apron front. Fired at 2900°F for exceptional durability and timeless beauty.',
    material: 'fireclay',
    mountingStyle: 'farmhouse',
    widthInches: '30.00',
    depthInches: '18.00',
    heightInches: '10.00',
    bowlCount: 1,
    basePrice: '799.99',
    laborCost: '450.00',
    imageUrl: null,
  },
  {
    sku: 'FC-FH-3320-DB',
    name: 'Heritage Fireclay Double 33"',
    description: 'Elegant double-bowl fireclay farmhouse sink. Each bowl accommodates large pots and baking sheets with ease.',
    material: 'fireclay',
    mountingStyle: 'farmhouse',
    widthInches: '33.00',
    depthInches: '20.00',
    heightInches: '10.00',
    bowlCount: 2,
    basePrice: '1099.99',
    laborCost: '500.00',
    imageUrl: null,
  },
  {
    sku: 'CI-FH-3018-WHT',
    name: 'Classic Cast Iron Farmhouse 30"',
    description: 'Iconic cast iron farmhouse sink with glossy porcelain enamel finish. Heavy-duty construction with timeless appeal.',
    material: 'cast_iron',
    mountingStyle: 'farmhouse',
    widthInches: '30.00',
    depthInches: '18.00',
    heightInches: '9.50',
    bowlCount: 1,
    basePrice: '849.99',
    laborCost: '475.00',
    imageUrl: null,
  },
  {
    sku: 'SS-FH-3620',
    name: 'Modern Steel Farmhouse 36"',
    description: 'Contemporary stainless steel farmhouse sink with clean lines. Extra-large single bowl for commercial-style functionality.',
    material: 'stainless_steel',
    mountingStyle: 'farmhouse',
    widthInches: '36.00',
    depthInches: '20.00',
    heightInches: '10.00',
    bowlCount: 1,
    basePrice: '649.99',
    laborCost: '400.00',
    imageUrl: null,
  },

  // Cast Iron Sinks
  {
    sku: 'CI-UM-3018-WHT',
    name: 'Prestige Cast Iron Undermount 30"',
    description: 'Premium cast iron undermount with bright white enamel. Exceptional heat retention and noise absorption.',
    material: 'cast_iron',
    mountingStyle: 'undermount',
    widthInches: '30.00',
    depthInches: '18.00',
    heightInches: '9.00',
    bowlCount: 1,
    basePrice: '549.99',
    laborCost: '350.00',
    imageUrl: null,
  },
  {
    sku: 'CI-DI-3322-BIS',
    name: 'Prestige Cast Iron Double 33"',
    description: 'Elegant biscuit-colored cast iron drop-in with double bowls. Self-rimming for easy installation.',
    material: 'cast_iron',
    mountingStyle: 'drop_in',
    widthInches: '33.00',
    depthInches: '22.00',
    heightInches: '9.50',
    bowlCount: 2,
    basePrice: '629.99',
    laborCost: '325.00',
    imageUrl: null,
  },

  // Copper Sinks
  {
    sku: 'CU-FH-3018',
    name: 'Artisan Copper Farmhouse 30"',
    description: 'Hand-hammered copper farmhouse sink that develops a unique patina over time. Naturally antimicrobial surface.',
    material: 'copper',
    mountingStyle: 'farmhouse',
    widthInches: '30.00',
    depthInches: '18.00',
    heightInches: '10.00',
    bowlCount: 1,
    basePrice: '1299.99',
    laborCost: '500.00',
    imageUrl: null,
  },
  {
    sku: 'CU-UM-2818',
    name: 'Artisan Copper Undermount 28"',
    description: 'Elegant undermount copper sink with smooth finish. Perfect for both modern and traditional kitchens.',
    material: 'copper',
    mountingStyle: 'undermount',
    widthInches: '28.00',
    depthInches: '18.00',
    heightInches: '9.00',
    bowlCount: 1,
    basePrice: '949.99',
    laborCost: '400.00',
    imageUrl: null,
  },

  // Porcelain Sinks
  {
    sku: 'PO-DI-2520',
    name: 'Victorian Porcelain Drop-In 25"',
    description: 'Classic white porcelain drop-in sink with vintage charm. Glossy finish is easy to clean and maintain.',
    material: 'porcelain',
    mountingStyle: 'drop_in',
    widthInches: '25.00',
    depthInches: '20.00',
    heightInches: '8.00',
    bowlCount: 1,
    basePrice: '279.99',
    laborCost: '200.00',
    imageUrl: null,
  },
  {
    sku: 'PO-DI-3322-DB',
    name: 'Victorian Porcelain Double 33"',
    description: 'Traditional double-bowl porcelain sink with matching drainboard. Ideal for period-style kitchen renovations.',
    material: 'porcelain',
    mountingStyle: 'drop_in',
    widthInches: '33.00',
    depthInches: '22.00',
    heightInches: '8.50',
    bowlCount: 2,
    basePrice: '379.99',
    laborCost: '250.00',
    imageUrl: null,
  },

  // Flush Mount Sinks
  {
    sku: 'SS-FM-3018',
    name: 'Seamless Flush Mount 30"',
    description: 'Ultra-modern flush mount stainless steel sink. Sits perfectly level with countertop for seamless cleaning.',
    material: 'stainless_steel',
    mountingStyle: 'flush_mount',
    widthInches: '30.00',
    depthInches: '18.00',
    heightInches: '8.00',
    bowlCount: 1,
    basePrice: '599.99',
    laborCost: '450.00',
    imageUrl: null,
  },
  {
    sku: 'GC-FM-3219-BLK',
    name: 'Onyx Flush Mount 32"',
    description: 'Striking black granite composite flush mount sink. Requires precision installation for perfect countertop integration.',
    material: 'granite_composite',
    mountingStyle: 'flush_mount',
    widthInches: '32.00',
    depthInches: '19.00',
    heightInches: '9.00',
    bowlCount: 1,
    basePrice: '699.99',
    laborCost: '500.00',
    imageUrl: null,
  },
];

async function seedDemoSinks() {
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

    // Check if sinks already exist
    const existingSinks = await sql`
      SELECT COUNT(*) as count FROM sinks WHERE company_id = ${DEMO_COMPANY_ID}
    `;

    if (Number(existingSinks[0].count) > 0) {
      console.log(`Found ${existingSinks[0].count} existing sinks for demo company.`);
      const response = process.argv.includes('--force') ? 'y' : 'n';
      if (response !== 'y' && !process.argv.includes('--force')) {
        console.log('Use --force flag to delete existing sinks and re-seed.');
        await sql.end();
        return;
      }

      // Delete existing sinks if --force
      await sql`DELETE FROM sinks WHERE company_id = ${DEMO_COMPANY_ID}`;
      console.log('Deleted existing sinks.');
    }

    // Insert demo sinks
    console.log(`Inserting ${demoSinks.length} demo sinks...`);

    for (const sink of demoSinks) {
      await sql`
        INSERT INTO sinks (
          company_id,
          sku,
          name,
          description,
          material,
          mounting_style,
          width_inches,
          depth_inches,
          height_inches,
          bowl_count,
          base_price,
          labor_cost,
          image_url,
          is_active
        ) VALUES (
          ${DEMO_COMPANY_ID},
          ${sink.sku},
          ${sink.name},
          ${sink.description},
          ${sink.material},
          ${sink.mountingStyle},
          ${sink.widthInches},
          ${sink.depthInches},
          ${sink.heightInches},
          ${sink.bowlCount},
          ${sink.basePrice},
          ${sink.laborCost},
          ${sink.imageUrl},
          true
        )
      `;
    }

    console.log('');
    console.log('=== Demo Sinks Seeded ===');
    console.log(`Total sinks added: ${demoSinks.length}`);
    console.log('');
    console.log('Breakdown by material:');
    const materialCounts = demoSinks.reduce((acc, sink) => {
      acc[sink.material] = (acc[sink.material] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(materialCounts).forEach(([material, count]) => {
      console.log(`  - ${material.replace('_', ' ')}: ${count}`);
    });
    console.log('');
    console.log('Breakdown by mounting style:');
    const styleCounts = demoSinks.reduce((acc, sink) => {
      acc[sink.mountingStyle] = (acc[sink.mountingStyle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(styleCounts).forEach(([style, count]) => {
      console.log(`  - ${style.replace('_', ' ')}: ${count}`);
    });
    console.log('=========================');

  } catch (error) {
    console.error('Error seeding sinks:', error);
  } finally {
    await sql.end();
  }
}

seedDemoSinks();
