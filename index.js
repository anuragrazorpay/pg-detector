import express from 'express';
import { chromium } from 'playwright';

const app = express();
app.use(express.json({ limit: '1mb' }));

/** 👉 Environment Variables (set in Railway) **/
const {
  OXY_SERVER = 'http://dc.oxylabs.io:8000',
  OXY_USER = 'your-oxylabs-username',
  OXY_PASS = 'your-oxylabs-password'
} = process.env;

/** ✅ PG keywords to detect in network requests **/
const PG_KEYWORDS = [
  'razorpay', 'stripe', 'payu', 'ccavenue', 'cashfree',
  'billdesk', 'paykun', 'mobikwik', 'juspay', 'phonepe',
  'easebuzz', 'instamojo', 'payglocal', 'airpay'
];

/** 💡 Helpers **/
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function dismissCommonPopups(page) {
  const selectors = [
    'button:has-text("accept")',
    'button:has-text("agree")',
    '[aria-label="close"]',
    '.close, .Close'
  ];
  for (const sel of selectors) {
    try {
      await page.click(sel, { timeout: 1200 });
    } catch (_) {}
  }
  try {
    await page.keyboard.press('Escape');
  } catch (_) {}
}

/** 🔍 Health check route **/
app.get('/', (_, res) => res.send('🟢 PG Detector (Tier 3) is live.'));

app.post('/detect', async (req, res) => {
  const { url } = req.body || {};
  if (!url?.startsWith('http')) {
    return res.status(400).json({ error: 'Body must contain { url } starting with http/https' });
  }

  let browser;
  const evidence = [];

  try {
    /** 🧠 Launch Chromium in stealth with Oxylabs proxy **/
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
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        `(KHTML, like Gecko) Chrome/119.0.${Math.floor(Math.random() * 2000)}.0 Safari/537.36`,
      viewport: { width: 1366, height: 768 }
    });

    await context.addInitScript(() =>
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    );

    const page = await context.newPage();

    /** 🎯 Listen for PG keyword matches in all requests **/
    page.on('request', (request) => {
      const reqUrl = request.url().toLowerCase();
      if (PG_KEYWORDS.some((pg) => reqUrl.includes(pg))) {
        evidence.push(reqUrl);
      }
    });

    /** 🌐 Load the site with fallback retry **/
    const tryNavigate = async () =>
      page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });

    try {
      await tryNavigate();
    } catch {
      await sleep(1500);
      await tryNavigate();
    }

    await dismissCommonPopups(page);
    await sleep(5000); // let any lazy-loaded scripts trigger

    await browser.close();

    const unique = [...new Set(evidence)];

    return res.json({
      detected: !!unique.length,
      gateway_urls: unique,
      confidence: unique.length ? 0.95 : 0.0
    });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(504).json({ error: 'Navigation failed: ' + err.message });
  }
});

app.listen(3000, () => console.log('✅ Server running on port 3000'));
