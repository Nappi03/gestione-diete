/*
  Migration script: sqlite -> supabase
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-sqlite-to-supabase.js
*/

const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const dbPath = path.join(process.cwd(), 'data', 'diet-studio.db');
  const db = new Database(dbPath, { readonly: true });

  const patientsRows = db.prepare(`SELECT id, first_name, last_name, created_at FROM patients ORDER BY id ASC`).all();
  console.log(`Found ${patientsRows.length} patients`);

  // Insert patients into supabase and map oldId -> newId
  const patientIdMap = new Map();

  // Insert in small batches
  const batchSize = 100;
  for (let i = 0; i < patientsRows.length; i += batchSize) {
    const batch = patientsRows.slice(i, i + batchSize).map((r) => ({ first_name: r.first_name, last_name: r.last_name, created_at: r.created_at }));
    const { data, error } = await supabase.from('patients').insert(batch).select();
    if (error) {
      console.error('Error inserting patients:', error);
      process.exit(1);
    }
    for (let j = 0; j < data.length; j++) {
      const old = patientsRows[i + j];
      const inserted = data[j];
      patientIdMap.set(old.id, inserted.id);
    }
    console.log(`Inserted patients ${i + 1}-${i + batch.length}`);
  }

  // Now migrate diets
  const dietsRows = db.prepare(`SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at FROM diets ORDER BY id ASC`).all();
  console.log(`Found ${dietsRows.length} diets`);

  for (let i = 0; i < dietsRows.length; i += batchSize) {
    const batch = dietsRows.slice(i, i + batchSize).map((r) => {
      const newPatientId = patientIdMap.get(r.patient_id);
      if (!newPatientId) {
        throw new Error(`Missing mapped patient id for ${r.patient_id}`);
      }
      return {
        patient_id: newPatientId,
        control_date: r.control_date,
        week_title: r.week_title || '',
        sheet_json: r.sheet_json,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    const { data, error } = await supabase.from('diets').upsert(batch, { onConflict: ['patient_id', 'control_date', 'week_title'] }).select();
    if (error) {
      console.error('Error inserting diets:', error);
      process.exit(1);
    }
    console.log(`Inserted diets ${i + 1}-${i + batch.length}`);
  }

  console.log('Migration complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
