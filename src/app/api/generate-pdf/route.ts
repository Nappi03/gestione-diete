import puppeteer from 'puppeteer';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    // Navigate to the dedicated print route so rendering is stable
    await page.goto(origin + '/print', { waitUntil: 'networkidle0' });

    // Navigate to the live page and print the whole document (same method used by scripts/generate-pdf.js)
    await page.emulateMediaType('print');
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
    await browser.close();

    const arrayBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);

    return new Response(arrayBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="dieta.pdf"',
      },
    });
  } catch (err) {
    console.error('PDF generation error', err);
    return new Response('PDF generation failed', { status: 500 });
  }
}
