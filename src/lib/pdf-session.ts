import fs from 'node:fs/promises';
import path from 'node:path';
import type { SheetState } from './sheet';

const PDF_SESSION_DIR = path.join(process.cwd(), 'data', 'pdf-sessions');

function resolvePdfSessionDir() {
  const configured = process.env.DATA_DIR?.trim();
  if (configured) {
    return path.join(configured, 'pdf-sessions');
  }

  return PDF_SESSION_DIR;
}

const SESSION_DIR = resolvePdfSessionDir();

async function ensureSessionDir() {
  await fs.mkdir(SESSION_DIR, { recursive: true });
}

function sessionFilePath(token: string) {
  return path.join(SESSION_DIR, `${token}.json`);
}

export async function createPdfSheetToken(sheet: SheetState) {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await ensureSessionDir();
  await fs.writeFile(sessionFilePath(token), JSON.stringify(sheet), 'utf8');
  return token;
}

export async function consumePdfSheetToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const filePath = sessionFilePath(token);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    await fs.unlink(filePath).catch(() => undefined);
    return JSON.parse(raw) as SheetState;
  } catch {
    return null;
  }
}
