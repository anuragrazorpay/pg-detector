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

  const OXY_PROXY = {
    server: 'http://dc.oxylabs.io:8000',
    username: 'user-test123_e8zrY-country-IN',
    password: 'Anuragrastogi123_'
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

    const context = await browser.newContext({
      proxy: {
        server: OXY_PROXY.server,
        username: OXY_PROXY.username,
        password: OXY_PROXY.password
      },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();

    // Track PG requests
    page.on('request', (request) => {
      const reqUrl = request.url().toLowerCase();
      if (pgKeywords.some(pg => reqUrl.includes(pg))) {
        pgHits.push(reqUrl);
      }
    });

    // Navigate with retry logic
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    } catch (err1) {
      await page.waitForTimeout(1000);
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 10000 });
      } catch (err2) {
        await browser.close();
        return res.status(504).json({ error: 'Timeout: Failed to load the page after retry' });
      }
    }

    await page.waitForTimeout(3000); // Let scripts settle

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
