import puppeteer from 'puppeteer';
import type { SheetState } from '../../../lib/sheet';
import { createPdfSheetToken } from '../../../lib/pdf-session';

type GeneratePdfPayload = {
  sheet?: SheetState;
  fileName?: string;
};

export async function POST(request: Request) {
  try {
    // If a PDF generation service URL is provided, proxy the request to it.
    const externalPdfUrl = process.env.PDF_SERVICE_URL;
    const externalPdfKey = process.env.PDF_SERVICE_KEY;
    if (externalPdfUrl) {
      const forwarded = await fetch(externalPdfUrl, {
        method: 'POST',
        body: await request.clone().text(),
        headers: {
          'Content-Type': 'application/json',
          ...(externalPdfKey ? { Authorization: `Bearer ${externalPdfKey}` } : {}),
        },
      });

      const buffer = await forwarded.arrayBuffer();
      const contentType = forwarded.headers.get('content-type') ?? 'application/pdf';
      const contentDisposition = forwarded.headers.get('content-disposition') ?? 'attachment; filename="dieta.pdf"';

      return new Response(buffer as any, {
        status: forwarded.status,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDisposition,
        },
      });
    }

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    const body = (await request.json()) as GeneratePdfPayload;
    const sheet = body.sheet;
    const fileName = sanitizePdfFileName(body.fileName ?? 'dieta.pdf');
    const sheetToken = sheet ? await createPdfSheetToken(sheet) : '';
    const sheetQuery = sheetToken ? `?token=${encodeURIComponent(sheetToken)}` : '';

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    // Navigate to the dedicated print route so rendering is stable
    await page.goto(origin + '/print' + sheetQuery, { waitUntil: 'networkidle0' });

    // Navigate to the live page and print the whole document (same method used by scripts/generate-pdf.js)
    await page.emulateMediaType('print');
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
    await browser.close();

    const arrayBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);

    return new Response(arrayBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error', err);
    return new Response('PDF generation failed', { status: 500 });
  }
}

function sanitizePdfFileName(value: string) {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return 'dieta.pdf';
  }

  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}
