// Minimal Puppeteer PDF service
// POST /generate -> accepts { sheet?, fileName? } and returns application/pdf

const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

const AUTH_KEY = process.env.PDF_SERVICE_KEY;

app.post('/generate', async (req, res) => {
  try {
    if (AUTH_KEY) {
      const auth = req.get('authorization') || '';
      if (!auth || auth.replace(/^Bearer\s+/i, '') !== AUTH_KEY) {
        return res.status(401).send('Unauthorized');
      }
    }

    const { sheet, fileName } = req.body || {};
    // For this minimal service we'll render a simple HTML page with the sheet JSON for demo purposes
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>PDF</title></head><body><pre>${JSON.stringify(
      sheet,
      null,
      2,
    )}</pre></body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    const filename = (fileName || 'dieta.pdf').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error('PDF service error', err);
    res.status(500).send('PDF generation failed');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`PDF service listening on port ${port}`);
});
