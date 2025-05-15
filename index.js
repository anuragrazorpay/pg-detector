import express from 'express';
import { chromium } from 'playwright';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Oxylabs Proxy Credentials (as provided)
const OXY_SERVER = 'http://dc.oxylabs.io:8000';
const OXY_USER = 'user-test123_e8zrY-country-US';
const OXY_PASS = 'Anuragrastogi123_';

// Known PG identifiers to detect
const PG_KEYWORDS = [
  'razorpay', 'stripe', 'payu', 'ccavenue', 'cashfree',
  'billdesk', 'paykun', 'mobikwik', 'juspay', 'phonepe',
  'easebuzz', 'instamojo', 'payglocal', 'airpay'
];

// Utility: pause
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Utility: dismiss cookie banners or popups
async function dismissPopups(page) {
  const selectors = [
    'button:has-text("accept")',
    'button:has-text("agree")',
    '[aria-label="close"]',
    '.close', '.Close', '#onetrust-accept-btn-handler'
  ];
  for (const sel of selectors) {
    try {
      await page.click(sel, { timeout: 1200 });
    } catch (_) {}
  }
  try { await page.keyboard.press('Escape'); } catch (_) {}
}

app.get('/', (_, res) => res.send('✅ PG detector (Tier 3 only) is live.'));

app.post('/detect', async (req, res) => {
  const { url } = req.body || {};
  if (!url?.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid URL in request body.' });
  }

  const evidence = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      proxy: {
        server: OXY_SERVER,
        username: OXY_USER,
        password: OXY_PASS
      },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                 "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1.2,
      hasTouch: true
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await context.newPage();

    page.on('request', request => {
      const reqUrl = request.url().toLowerCase();
      if (PG_KEYWORDS.some(pg => reqUrl.includes(pg))) {
        evidence.push(reqUrl);
      }
    });

    // Try loading the page twice (with retry)
    const navigate = () => page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
    try {
      await navigate();
    } catch {
      await sleep(1500);
      await navigate();
    }

    await dismissPopups(page);
    await sleep(5000); // Wait for scripts to settle

    await browser.close();

    const deduped = [...new Set(evidence)];
    return res.json({
      detected: deduped.length > 0,
      gateway_urls: deduped,
      confidence: deduped.length ? 0.95 : 0.0
    });

  } catch (err) {
    if (browser) await browser.close();
    return res.status(504).json({
      error: 'Timeout or navigation failure: ' + err.message
    });
  }
});

app.listen(3000, () => console.log('🚀 Tier 3 PG detector running on port 3000'));
