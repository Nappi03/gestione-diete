/*
  Migration script: sqlite -> Postgres (direct connection)
  Usage:
    DATABASE_URL=postgresql://user:pass@host:5432/db node scripts/migrate-sqlite-to-postgres.js
*/

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || process.env.PG_CONNECTION || process.argv[2];

  if (!DATABASE_URL) {
    console.error('Please set DATABASE_URL (postgres connection string)');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  const dbPath = path.join(process.cwd(), 'data', 'diet-studio.db');
  const sqlite = new Database(dbPath, { readonly: true });

  const patientsRows = sqlite.prepare(`SELECT id, first_name, last_name, created_at FROM patients ORDER BY id ASC`).all();
  console.log(`Found ${patientsRows.length} patients`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Map old sqlite id -> new postgres id
    const patientIdMap = new Map();

    for (const row of patientsRows) {
      const insertText = `INSERT INTO patients (first_name, last_name, created_at) VALUES ($1, $2, $3) RETURNING id`;
      const insertValues = [row.first_name, row.last_name, row.created_at];
      const res = await client.query(insertText, insertValues);
      patientIdMap.set(row.id, res.rows[0].id);
    }

    console.log(`Inserted ${patientIdMap.size} patients`);

    const dietsRows = sqlite.prepare(`SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at FROM diets ORDER BY id ASC`).all();
    console.log(`Found ${dietsRows.length} diets`);

    for (const r of dietsRows) {
      const newPatientId = patientIdMap.get(r.patient_id);
      if (!newPatientId) {
        throw new Error(`Missing mapped patient id for ${r.patient_id}`);
      }

      const insertText = `INSERT INTO diets (patient_id, control_date, week_title, sheet_json, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (patient_id, control_date, week_title)
        DO UPDATE SET sheet_json = EXCLUDED.sheet_json, updated_at = EXCLUDED.updated_at`;
      const insertValues = [newPatientId, r.control_date, r.week_title || '', r.sheet_json, r.created_at, r.updated_at];
      await client.query(insertText, insertValues);
    }

    await client.query('COMMIT');
    console.log('Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
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
