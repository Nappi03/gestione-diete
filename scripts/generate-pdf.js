const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generate() {
  const out = path.join(__dirname, '..', 'out.pdf');
  const url = 'http://localhost:3001';

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  console.log('Opening page', url);
  await page.goto(url, { waitUntil: 'networkidle0' });
  // Ensure print-specific CSS is applied when generating PDF
  await page.emulateMediaType('print');
  console.log('Printing PDF...');
  await page.pdf({ path: out, format: 'A4', landscape: true, printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
  await browser.close();
  console.log('Saved PDF to', out);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
