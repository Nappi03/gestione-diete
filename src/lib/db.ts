import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { supabase, useSupabase } from './supabaseClient';
import type { SheetState } from './sheet';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg') as any;

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => any;
  transaction: (fn: (...args: any[]) => any) => (...args: any[]) => any;
};

type PatientRow = {
  id: number;
  first_name: string;
  last_name: string;
  created_at: string;
};

type DietRow = {
  id: number;
  patient_id: number;
  control_date: string;
  week_title: string;
  sheet_json: string;
  created_at: string;
  updated_at: string;
};

const globalForDb = globalThis as unknown as { dietDb?: SqliteDatabase };
const globalForPg = globalThis as unknown as { dietPgPool?: any };

const hasPostgresConnection = Boolean(process.env.DATABASE_URL);

function getPgPool() {
  if (!hasPostgresConnection) {
    return null;
  }

  if (!globalForPg.dietPgPool) {
    globalForPg.dietPgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return globalForPg.dietPgPool;
}

async function queryPostgres<T = unknown>(text: string, values: unknown[] = []) {
  const pool = getPgPool();
  if (!pool) {
    return null;
  }

  const result = await pool.query(text, values);
  return result as { rows: T[]; rowCount: number };
}

function getDatabasePath() {
  // Allow overriding the data directory with an env var for special hosts
  const configured = process.env.DATA_DIR?.trim();
  if (configured) {
    if (!fs.existsSync(configured)) {
      try {
        fs.mkdirSync(configured, { recursive: true });
      } catch (err) {
        console.error('Failed to create DATA_DIR', configured, err);
      }
    }

    return path.join(configured, 'diet-studio.db');
  }

  // In serverless environments (Vercel/AWS Lambda) the project folder is read-only.
  // Use a writable temp directory instead to avoid ENOENT when mkdir '/var/task/data'.
  const isServerless = Boolean(process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  if (isServerless) {
    const tmpData = path.join(os.tmpdir(), 'gestione-diete-data');
    try {
      if (!fs.existsSync(tmpData)) fs.mkdirSync(tmpData, { recursive: true });
      return path.join(tmpData, 'diet-studio.db');
    } catch (err) {
      console.error('Failed to create tmp data dir', tmpData, err);
      // Fall back to in-memory SQLite if tmp dir creation fails
      return ':memory:';
    }
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create data dir', dataDir, err);
    }
  }

  return path.join(dataDir, 'diet-studio.db');
}

function initSchema(db: SqliteDatabase) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS diets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      control_date TEXT NOT NULL,
      week_title TEXT NOT NULL DEFAULT '',
      sheet_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(patient_id, control_date, week_title),
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diets_patient_id ON diets(patient_id);
    CREATE INDEX IF NOT EXISTS idx_diets_control_date ON diets(control_date);
  `);
}

function ensureDietWeekColumn(db: SqliteDatabase) {
  const dietColumns = db.prepare(`PRAGMA table_info(diets)`).all() as Array<{ name: string }>;
  if (dietColumns.some((column) => column.name === 'week_title')) {
    return;
  }

  db.exec(`ALTER TABLE diets RENAME TO diets_legacy;`);
  db.exec(`
    CREATE TABLE diets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      control_date TEXT NOT NULL,
      week_title TEXT NOT NULL DEFAULT '',
      sheet_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(patient_id, control_date, week_title),
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diets_patient_id ON diets(patient_id);
    CREATE INDEX IF NOT EXISTS idx_diets_control_date ON diets(control_date);
  `);

  const legacyRows = db
    .prepare(
      `SELECT id, patient_id, control_date, sheet_json, created_at, updated_at
       FROM diets_legacy
       ORDER BY id ASC`,
    )
    .all() as Array<{
      id: number;
      patient_id: number;
      control_date: string;
      sheet_json: string;
      created_at: string;
      updated_at: string;
    }>;

  const insertDiet = db.prepare(
    `INSERT INTO diets (id, patient_id, control_date, week_title, sheet_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const migrate = db.transaction((rows: typeof legacyRows) => {
    for (const row of rows) {
      let weekTitle = '';
      try {
        const sheet = JSON.parse(row.sheet_json) as Partial<SheetState>;
        weekTitle = String(sheet.weekTitle ?? '').trim();
      } catch {
        weekTitle = '';
      }

      insertDiet.run(
        row.id,
        row.patient_id,
        row.control_date,
        weekTitle,
        row.sheet_json,
        row.created_at,
        row.updated_at,
      );
    }
  });

  migrate(legacyRows);
  db.exec(`DROP TABLE diets_legacy;`);
}

function ensureSchema(db: SqliteDatabase) {
  initSchema(db);
  ensureDietWeekColumn(db);
}

export function getDb() {
  if (!globalForDb.dietDb) {
    const dbPath = getDatabasePath();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3') as new (filePath: string) => SqliteDatabase;
    const db = new Database(dbPath);
    globalForDb.dietDb = db;
  }

  const db = globalForDb.dietDb;
  ensureSchema(db);
  return db;
}



export async function listPatients() {
  if (hasPostgresConnection) {
    const result = await queryPostgres<PatientRow>(
      `SELECT id, first_name, last_name, created_at
       FROM patients
       ORDER BY last_name ASC, first_name ASC`,
    );

    return (result?.rows ?? []).map((row: PatientRow) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
    }));
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, created_at')
      .order('last_name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
    }));
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, first_name, last_name, created_at
       FROM patients
       ORDER BY last_name ASC, first_name ASC`,
    )
    .all() as PatientRow[];

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
  }));
}

export async function createPatient(firstName: string, lastName: string) {
  if (hasPostgresConnection) {
    const result = await queryPostgres<PatientRow>(
      `INSERT INTO patients (first_name, last_name)
       VALUES ($1, $2)
       RETURNING id, first_name, last_name, created_at`,
      [firstName.trim(), lastName.trim()],
    );

    const patient = result?.rows[0];
    if (!patient) {
      throw new Error('Failed to create patient');
    }

    return {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      createdAt: patient.created_at,
    };
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('patients')
      .insert({ first_name: firstName.trim(), last_name: lastName.trim() })
      .select()
      .limit(1)
      .single();
    if (error) throw error;
    const row = data as any;
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
    };
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO patients (first_name, last_name)
       VALUES (?, ?)`,
    )
    .run(firstName.trim(), lastName.trim());

  const patient = db
    .prepare(
      `SELECT id, first_name, last_name, created_at
       FROM patients
       WHERE id = ?`,
    )
    .get(result.lastInsertRowid) as PatientRow;

  return {
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    createdAt: patient.created_at,
  };
}

export async function updatePatient(patientId: number, firstName: string, lastName: string) {
  if (hasPostgresConnection) {
    const result = await queryPostgres<PatientRow>(
      `UPDATE patients
       SET first_name = $1,
           last_name = $2
       WHERE id = $3
       RETURNING id, first_name, last_name, created_at`,
      [firstName.trim(), lastName.trim(), patientId],
    );

    const patient = result?.rows[0];
    if (!patient) {
      return null;
    }

    return {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      createdAt: patient.created_at,
    };
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('patients')
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq('id', patientId)
      .select()
      .limit(1)
      .single();
    if (error) throw error;
    const row = data as any;
    if (!row) return null;
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
    };
  }

  const db = getDb();
  db.prepare(
    `UPDATE patients
     SET first_name = ?, last_name = ?
     WHERE id = ?`,
  ).run(firstName.trim(), lastName.trim(), patientId);

  const patient = db
    .prepare(
      `SELECT id, first_name, last_name, created_at
       FROM patients
       WHERE id = ?`,
    )
    .get(patientId) as PatientRow | undefined;

  if (!patient) {
    return null;
  }

  return {
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    createdAt: patient.created_at,
  };
}

export async function deletePatient(patientId: number) {
  if (hasPostgresConnection) {
    const result = await queryPostgres(
      `DELETE FROM patients WHERE id = $1`,
      [patientId],
    );

    return Boolean(result && result.rowCount && result.rowCount > 0);
  }

  if (useSupabase && supabase) {
    const { error } = await supabase.from('patients').delete().eq('id', patientId);
    if (error) throw error;
    return true;
  }

  const db = getDb();
  const result = db.prepare(`DELETE FROM patients WHERE id = ?`).run(patientId);
  return result.changes > 0;
}

export async function saveDietForControlDate(
  patientId: number,
  controlDate: string,
  weekTitle: string,
  sheet: SheetState,
) {
  const serialized = JSON.stringify(sheet);
  const normalizedWeekTitle = weekTitle.trim() || String(sheet.weekTitle ?? '').trim();

  if (hasPostgresConnection) {
    const result = await queryPostgres<DietRow>(
      `INSERT INTO diets (patient_id, control_date, week_title, sheet_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (patient_id, control_date, week_title)
       DO UPDATE SET
         sheet_json = EXCLUDED.sheet_json,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, patient_id, control_date, week_title, sheet_json, created_at, updated_at`,
      [patientId, controlDate, normalizedWeekTitle, serialized],
    );

    const row = result?.rows[0];
    if (!row) {
      throw new Error('Failed to save diet');
    }

    return {
      id: row.id,
      patientId: row.patient_id,
      controlDate: row.control_date,
      weekTitle: row.week_title,
      sheet: JSON.parse(row.sheet_json) as SheetState,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  if (useSupabase && supabase) {
    const upsertObj = {
      patient_id: patientId,
      control_date: controlDate,
      week_title: normalizedWeekTitle,
      sheet_json: serialized,
    };
    const { error: upsertError } = await supabase
      .from('diets')
      .upsert(upsertObj, { onConflict: 'patient_id,control_date,week_title' });
    if (upsertError) throw upsertError;

    const { data, error } = await supabase
      .from('diets')
      .select('id, patient_id, control_date, week_title, sheet_json, created_at, updated_at')
      .eq('patient_id', patientId)
      .eq('control_date', controlDate)
      .eq('week_title', normalizedWeekTitle)
      .limit(1)
      .single();
    if (error) throw error;
    const row = data as any;
    return {
      id: row.id,
      patientId: row.patient_id,
      controlDate: row.control_date,
      weekTitle: row.week_title,
      sheet: JSON.parse(row.sheet_json) as SheetState,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const db = getDb();
  const serializedLocal = serialized;

  db.prepare(
    `INSERT INTO diets (patient_id, control_date, week_title, sheet_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(patient_id, control_date, week_title)
     DO UPDATE SET
       sheet_json = excluded.sheet_json,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(patientId, controlDate, normalizedWeekTitle, serializedLocal);

  const row = db
    .prepare(
      `SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at
       FROM diets
       WHERE patient_id = ? AND control_date = ? AND week_title = ?`,
    )
    .get(patientId, controlDate, normalizedWeekTitle) as DietRow;

  return {
    id: row.id,
    patientId: row.patient_id,
    controlDate: row.control_date,
    weekTitle: row.week_title,
    sheet: JSON.parse(row.sheet_json) as SheetState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteDietForControlDate(patientId: number, controlDate: string, weekTitle: string) {
  if (hasPostgresConnection) {
    const result = await queryPostgres(
      `DELETE FROM diets
       WHERE patient_id = $1 AND control_date = $2 AND week_title = $3`,
      [patientId, controlDate, weekTitle.trim()],
    );

    return Boolean(result && result.rowCount && result.rowCount > 0);
  }

  if (useSupabase && supabase) {
    const { error } = await supabase
      .from('diets')
      .delete()
      .eq('patient_id', patientId)
      .eq('control_date', controlDate)
      .eq('week_title', weekTitle.trim());
    if (error) throw error;
    return true;
  }

  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM diets
       WHERE patient_id = ? AND control_date = ? AND week_title = ?`,
    )
    .run(patientId, controlDate, weekTitle.trim());

  return result.changes > 0;
}

export async function getDietForControlDate(patientId: number, controlDate: string, weekTitle?: string) {
  if (hasPostgresConnection) {
    const result = weekTitle
      ? await queryPostgres<DietRow>(
          `SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at
           FROM diets
           WHERE patient_id = $1 AND control_date = $2 AND week_title = $3
           LIMIT 1`,
          [patientId, controlDate, weekTitle.trim()],
        )
      : await queryPostgres<DietRow>(
          `SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at
           FROM diets
           WHERE patient_id = $1 AND control_date = $2
           ORDER BY updated_at DESC, id DESC
           LIMIT 1`,
          [patientId, controlDate],
        );

    const row = result?.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      patientId: row.patient_id,
      controlDate: row.control_date,
      weekTitle: row.week_title,
      sheet: JSON.parse(row.sheet_json) as SheetState,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  if (useSupabase && supabase) {
    if (weekTitle) {
      const { data, error } = await supabase
        .from('diets')
        .select('id, patient_id, control_date, week_title, sheet_json, created_at, updated_at')
        .eq('patient_id', patientId)
        .eq('control_date', controlDate)
        .eq('week_title', weekTitle.trim())
        .limit(1)
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return null;
        throw error;
      }
      const row = data as any;
      if (!row) return null;
      return {
        id: row.id,
        patientId: row.patient_id,
        controlDate: row.control_date,
        weekTitle: row.week_title,
        sheet: JSON.parse(row.sheet_json) as SheetState,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    const { data, error } = await supabase
      .from('diets')
      .select('id, patient_id, control_date, week_title, sheet_json, created_at, updated_at')
      .eq('patient_id', patientId)
      .eq('control_date', controlDate)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = (data && data[0]) as any | undefined;
    if (!row) return null;
    return {
      id: row.id,
      patientId: row.patient_id,
      controlDate: row.control_date,
      weekTitle: row.week_title,
      sheet: JSON.parse(row.sheet_json) as SheetState,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const db = getDb();
  const row = weekTitle
    ? (db
        .prepare(
          `SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at
           FROM diets
           WHERE patient_id = ? AND control_date = ? AND week_title = ?`,
        )
        .get(patientId, controlDate, weekTitle.trim()) as DietRow | undefined)
    : (db
        .prepare(
          `SELECT id, patient_id, control_date, week_title, sheet_json, created_at, updated_at
           FROM diets
           WHERE patient_id = ? AND control_date = ?
           ORDER BY updated_at DESC, id DESC
           LIMIT 1`,
        )
        .get(patientId, controlDate) as DietRow | undefined);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    patientId: row.patient_id,
    controlDate: row.control_date,
    weekTitle: row.week_title,
    sheet: JSON.parse(row.sheet_json) as SheetState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listControlRecordsForPatient(patientId: number) {
  if (hasPostgresConnection) {
    const result = await queryPostgres<{ control_date: string; week_title: string }>(
      `SELECT control_date, week_title
       FROM diets
       WHERE patient_id = $1
       ORDER BY control_date DESC, created_at DESC, id DESC`,
      [patientId],
    );

    return (result?.rows ?? []).map((row: { control_date: string; week_title: string }) => ({
      controlDate: row.control_date,
      weekTitle: row.week_title,
    }));
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('diets')
      .select('control_date, week_title')
      .eq('patient_id', patientId)
      .order('control_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ controlDate: row.control_date, weekTitle: row.week_title }));
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT control_date, week_title
       FROM diets
       WHERE patient_id = ?
       ORDER BY control_date DESC, created_at DESC, id DESC`,
    )
    .all(patientId) as Array<{ control_date: string; week_title: string }>;

  return rows.map((row) => ({
    controlDate: row.control_date,
    weekTitle: row.week_title,
  }));
}
