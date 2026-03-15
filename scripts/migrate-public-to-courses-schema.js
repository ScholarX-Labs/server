const { Pool } = require('pg');

async function tableExists(pool, schema, table) {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
      LIMIT 1
    `,
    [schema, table],
  );
  return result.rowCount > 0;
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/scholarx';

  const pool = new Pool({ connectionString });

  try {
    await pool.query('BEGIN');
    await pool.query('CREATE SCHEMA IF NOT EXISTS courses');

    const tables = ['courses', 'lessons', 'subscriptions'];

    for (const table of tables) {
      const existsInCourses = await tableExists(pool, 'courses', table);
      const existsInPublic = await tableExists(pool, 'public', table);

      if (existsInCourses) {
        console.log(`Skipping ${table}: already in courses schema`);
        continue;
      }

      if (!existsInPublic) {
        console.log(`Skipping ${table}: not found in public schema`);
        continue;
      }

      await pool.query(`ALTER TABLE public.${table} SET SCHEMA courses`);
      console.log(`Moved public.${table} -> courses.${table}`);
    }

    await pool.query('COMMIT');
    console.log('Schema migration complete.');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to migrate tables to courses schema');
  console.error('message:', error?.message);
  console.error('code:', error?.code);
  console.error('detail:', error?.detail);
  process.exit(1);
});
