import {
  deleteDietForControlDate,
  getDietForControlDate,
  listControlRecordsForPatient,
  saveDietForControlDate,
} from '../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientIdRaw = url.searchParams.get('patientId');
    const controlDate = url.searchParams.get('controlDate');
    const weekTitle = url.searchParams.get('weekTitle');

    if (!patientIdRaw) {
      return Response.json({ error: 'patientId is required' }, { status: 400 });
    }

    const patientId = Number(patientIdRaw);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return Response.json({ error: 'patientId must be a positive integer' }, { status: 400 });
    }

    if (!controlDate) {
      const controlRecords = listControlRecordsForPatient(patientId);
      return Response.json({ controlRecords });
    }

    const diet = getDietForControlDate(patientId, controlDate, weekTitle ?? undefined);
    return Response.json({ diet });
  } catch (error) {
    console.error('diets GET error', error);
    return Response.json({ error: 'Failed to read diets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const patientId = Number(body?.patientId);
    const controlDate = String(body?.controlDate ?? '').trim();
    const weekTitle = String(body?.weekTitle ?? '').trim();
    const sheet = body?.sheet;

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return Response.json({ error: 'patientId must be a positive integer' }, { status: 400 });
    }

    if (!controlDate) {
      return Response.json({ error: 'controlDate is required' }, { status: 400 });
    }

    if (!weekTitle) {
      return Response.json({ error: 'weekTitle is required' }, { status: 400 });
    }

    if (!sheet || typeof sheet !== 'object') {
      return Response.json({ error: 'sheet is required' }, { status: 400 });
    }

    const diet = saveDietForControlDate(patientId, controlDate, weekTitle, sheet);
    return Response.json({ diet }, { status: 201 });
  } catch (error) {
    console.error('diets POST error', error);
    return Response.json({ error: 'Failed to save diet' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const patientIdRaw = url.searchParams.get('patientId');
    const controlDate = url.searchParams.get('controlDate');
    const weekTitle = url.searchParams.get('weekTitle');

    if (!patientIdRaw) {
      return Response.json({ error: 'patientId is required' }, { status: 400 });
    }

    if (!controlDate) {
      return Response.json({ error: 'controlDate is required' }, { status: 400 });
    }

    if (!weekTitle) {
      return Response.json({ error: 'weekTitle is required' }, { status: 400 });
    }

    const patientId = Number(patientIdRaw);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return Response.json({ error: 'patientId must be a positive integer' }, { status: 400 });
    }

    const deleted = deleteDietForControlDate(patientId, controlDate, weekTitle);
    if (!deleted) {
      return Response.json({ error: 'Diet not found' }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('diets DELETE error', error);
    return Response.json({ error: 'Failed to delete diet' }, { status: 500 });
  }
}
