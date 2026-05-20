import puppeteer from 'puppeteer';
import type { SheetState } from '../../../lib/sheet';
import { createPdfSheetToken } from '../../../lib/pdf-session';

export const runtime = 'nodejs';

type GeneratePdfPayload = {
  sheet?: SheetState;
  fileName?: string;
};

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    const body = (await request.json()) as GeneratePdfPayload;
    const sheet = body.sheet;
    const fileName = sanitizePdfFileName(body.fileName ?? 'dieta.pdf');
    const sheetToken = sheet ? await createPdfSheetToken(sheet) : '';
    const sheetQuery = sheetToken ? `?token=${encodeURIComponent(sheetToken)}` : '';

    const browser = await launchPdfBrowser();

    try {
      const page = await browser.newPage();
      await page.goto(origin + '/print' + sheetQuery, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      });

      const arrayBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);

      return new Response(arrayBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('PDF generation error', err);
    return new Response('PDF generation failed', { status: 500 });
  }
}

async function launchPdfBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    const chromiumModule = await import('@sparticuz/chromium');
    const puppeteerCore = await import('puppeteer-core');
    const chromium = chromiumModule.default;

    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  return puppeteer.launch({ args: ['--no-sandbox'] });
}

function sanitizePdfFileName(value: string) {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return 'dieta.pdf';
  }

  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

