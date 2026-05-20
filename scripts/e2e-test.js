/*
  Simple E2E test script that hits the local dev server.
  Start the Next dev server (`npm run dev`) and ensure PDF service is running or PDF_SERVICE_URL is set.

  Usage:
    node scripts/e2e-test.js
*/

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  try {
    console.log('Creating patient...');
    const createRes = await fetch(`${BASE}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'Patient' }),
    });
    const createJson = await createRes.json();
    if (!createRes.ok) {
      throw new Error('Create patient failed: ' + JSON.stringify(createJson));
    }
    const patient = createJson.patient;
    console.log('Created patient:', patient);

    console.log('Saving diet...');
    const sheet = { weekTitle: 'Test Week', meals: [] };
    const saveRes = await fetch(`${BASE}/api/diets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id, controlDate: '2026-05-20', weekTitle: 'Test Week', sheet }),
    });
    const saveJson = await saveRes.json();
    if (!saveRes.ok) {
      throw new Error('Save diet failed: ' + JSON.stringify(saveJson));
    }
    console.log('Saved diet:', saveJson.diet);

    console.log('Requesting PDF...');
    const pdfRes = await fetch(`${BASE}/api/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet, fileName: 'test-dieta.pdf' }),
    });
    if (!pdfRes.ok) {
      const text = await pdfRes.text();
      throw new Error('PDF generation failed: ' + text);
    }
    const buf = await pdfRes.arrayBuffer();
    console.log('PDF generated, bytes:', buf.byteLength);

    console.log('E2E test completed successfully');
  } catch (err) {
    console.error('E2E error:', err);
    process.exitCode = 1;
  }
}

run();
