import { createPatient, deletePatient, listPatients, updatePatient } from '../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const patients = listPatients();
    return Response.json({ patients });
  } catch (error) {
    console.error('patients GET error', error);
    return Response.json({ error: 'Failed to list patients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = String(body?.firstName ?? '').trim();
    const lastName = String(body?.lastName ?? '').trim();

    if (!firstName || !lastName) {
      return Response.json(
        { error: 'firstName and lastName are required' },
        { status: 400 },
      );
    }

    const patient = createPatient(firstName, lastName);
    return Response.json({ patient }, { status: 201 });
  } catch (error) {
    console.error('patients POST error', error);
    return Response.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const patientId = Number(body?.patientId);
    const firstName = String(body?.firstName ?? '').trim();
    const lastName = String(body?.lastName ?? '').trim();

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return Response.json({ error: 'patientId must be a positive integer' }, { status: 400 });
    }

    if (!firstName || !lastName) {
      return Response.json({ error: 'firstName and lastName are required' }, { status: 400 });
    }

    const patient = updatePatient(patientId, firstName, lastName);
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    return Response.json({ patient });
  } catch (error) {
    console.error('patients PATCH error', error);
    return Response.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const patientIdRaw = url.searchParams.get('patientId');

    if (!patientIdRaw) {
      return Response.json({ error: 'patientId is required' }, { status: 400 });
    }

    const patientId = Number(patientIdRaw);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return Response.json({ error: 'patientId must be a positive integer' }, { status: 400 });
    }

    const deleted = deletePatient(patientId);
    if (!deleted) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('patients DELETE error', error);
    return Response.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}
