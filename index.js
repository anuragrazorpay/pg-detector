const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('PG Detector running ✅'));

app.post('/detect', async (req, res) => {
  const { url } = req.body;
  if (!url?.startsWith('http')) return res.status(400).json({ error: 'Invalid URL' });

  const pgHits = [];
  const pgKeywords = ['razorpay', 'stripe', 'payu', 'ccavenue', 'cashfree', 'billdesk', 'juspay', 'phonepe'];

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext()).newPage();

  page.on('request', r => {
    const u = r.url().toLowerCase();
    if (pgKeywords.some(k => u.includes(k))) pgHits.push(u);
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    await browser.close();
    res.json({ detected: !!pgHits.length, gateway_urls: [...new Set(pgHits)], confidence: pgHits.length ? 0.95 : 0 });
  } catch (e) {
    await browser.close();
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
