const { Pool } = require('pg');

async function seedMockUser() {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/scholarx';
  const pool = new Pool({ connectionString });

  try {
    const res = await pool.query(`
      INSERT INTO users (id, name, email) 
      VALUES ('00000000-0000-0000-0000-000000000001', 'Mock Developer User', 'mock@scholarx.com') 
      ON CONFLICT (email) DO NOTHING 
      RETURNING *
    `);
    if (res.rows.length > 0) {
      console.log('Mock user inserted:', res.rows[0]);
    } else {
      console.log('Mock user already exists.');
    }
  } catch (error) {
    // If it fails, maybe table is in public schema, though drizzle adds it where it belongs.
    console.error('Error inserting mock user:', error.message);
  } finally {
    await pool.end();
  }
}

seedMockUser().catch(console.error);
