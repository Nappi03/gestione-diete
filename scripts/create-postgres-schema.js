/*
  Create Postgres schema for patients and diets.
  Usage:
    DATABASE_URL=... node scripts/create-postgres-schema.js
*/

const { Pool } = require('pg');

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || process.argv[2];
  if (!DATABASE_URL) {
    console.error('Please set DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS diets (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        control_date TEXT NOT NULL,
        week_title TEXT NOT NULL DEFAULT '',
        sheet_json TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        UNIQUE(patient_id, control_date, week_title)
      );

      CREATE INDEX IF NOT EXISTS idx_diets_patient_id ON diets(patient_id);
      CREATE INDEX IF NOT EXISTS idx_diets_control_date ON diets(control_date);
    `;

    await client.query(sql);
    console.log('Schema created/ensured.');
  } catch (err) {
    console.error('Error creating schema:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
