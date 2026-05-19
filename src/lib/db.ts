import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SheetState } from './sheet';

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

const globalForDb = globalThis as unknown as { dietDb?: Database.Database };

function getDatabasePath() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, 'diet-studio.db');
}

function initSchema(db: Database.Database) {
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

function ensureDietWeekColumn(db: Database.Database) {
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

function ensureSchema(db: Database.Database) {
  initSchema(db);
  ensureDietWeekColumn(db);
}

export function getDb() {
  if (!globalForDb.dietDb) {
    const dbPath = getDatabasePath();
    const db = new Database(dbPath);
    globalForDb.dietDb = db;
  }

  const db = globalForDb.dietDb;
  ensureSchema(db);
  return db;
}

export function listPatients() {
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

export function createPatient(firstName: string, lastName: string) {
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

export function updatePatient(patientId: number, firstName: string, lastName: string) {
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

export function deletePatient(patientId: number) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM patients WHERE id = ?`).run(patientId);
  return result.changes > 0;
}

export function saveDietForControlDate(
  patientId: number,
  controlDate: string,
  weekTitle: string,
  sheet: SheetState,
) {
  const db = getDb();
  const serialized = JSON.stringify(sheet);
  const normalizedWeekTitle = weekTitle.trim() || String(sheet.weekTitle ?? '').trim();

  db.prepare(
    `INSERT INTO diets (patient_id, control_date, week_title, sheet_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(patient_id, control_date, week_title)
     DO UPDATE SET
       sheet_json = excluded.sheet_json,
       updated_at = CURRENT_TIMESTAMP`,
  ).run(patientId, controlDate, normalizedWeekTitle, serialized);

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

export function deleteDietForControlDate(patientId: number, controlDate: string, weekTitle: string) {
  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM diets
       WHERE patient_id = ? AND control_date = ? AND week_title = ?`,
    )
    .run(patientId, controlDate, weekTitle.trim());

  return result.changes > 0;
}

export function getDietForControlDate(patientId: number, controlDate: string, weekTitle?: string) {
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

export function listControlRecordsForPatient(patientId: number) {
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
