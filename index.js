const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('PG Detector running ✅'));

app.post('/detect', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  const pgHits = [];
  const pgKeywords = [
    'razorpay', 'stripe', 'payu', 'ccavenue', 'cashfree',
    'billdesk', 'paykun', 'mobikwik', 'juspay', 'phonepe',
    'easebuzz', 'instamojo'
  ];

  let browser;

  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

    // ✅ Optional: force IPv4 DNS routing
    const context = await browser.newContext({
      proxy: {
        server: 'http://ipv4only.arpa'
      }
    });

    const page = await context.newPage();

    page.on('request', (request) => {
      const reqUrl = request.url().toLowerCase();
      if (pgKeywords.some(keyword => reqUrl.includes(keyword))) {
        pgHits.push(reqUrl);
      }
    });

    // ✅ Try first attempt
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    } catch (err) {
      // ✅ Retry once after 1s if DNS fails
      await page.waitForTimeout(1000);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
    }

    await page.waitForTimeout(3000); // Let scripts load

    await browser.close();

    return res.json({
      detected: !!pgHits.length,
      gateway_urls: [...new Set(pgHits)],
      confidence: pgHits.length ? 0.95 : 0.0
    });

  } catch (error) {
    if (browser) await browser.close();
    return res.status(502).json({ error: 'Navigation failed: ' + error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
