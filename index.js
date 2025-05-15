// index.js – Tier 4 PG Detector (Dynamic, All-in-One)
import express from 'express';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { getDisposableEmail } from './helpers/emailHelper.js';
import { dismissPopups, autoScroll } from './helpers/popupHelper.js';
import { performFlow } from './helpers/flowUtils.js';
import { findProductPage } from './helpers/sitemapFinder.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Load config for a domain if available
function loadFlowConfig(domain) {
  const configPath = path.join(__dirname, 'flows', `${domain}.json`);
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  const defaultPath = path.join(__dirname, 'flows', `default.json`);
  return fs.existsSync(defaultPath)
    ? JSON.parse(fs.readFileSync(defaultPath, 'utf8'))
    : {};
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// PG keywords
const PG_KEYWORDS = [
  'razorpay', 'stripe', 'payu', 'ccavenue', 'cashfree',
  'billdesk', 'paykun', 'mobikwik', 'juspay', 'phonepe',
  'easebuzz', 'instamojo', 'payglocal', 'airpay', 'setu'
];

// Main detection endpoint
app.post('/detect', async (req, res) => {
  const { url } = req.body || {};
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const domain = extractDomain(url);
  const config = loadFlowConfig(domain);
  let browser;
  const evidence = [];
  const flowStatus = {};

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const context = await browser.newContext({
      proxy: {
        server: process.env.OXY_SERVER,
        username: process.env.OXY_USER,
        password: process.env.OXY_PASS,
      },
      userAgent: process.env.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1.2,
      hasTouch: true
    });

    const page = await context.newPage();

    page.on('request', request => {
      const rUrl = request.url().toLowerCase();
      if (PG_KEYWORDS.some(k => rUrl.includes(k))) {
        evidence.push(rUrl);
      }
    });

    const productUrl = config.product?.page || await findProductPage(url);
    if (!productUrl) throw new Error('No product URL found');

    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissPopups(page);
    await autoScroll(page);

    const email = await getDisposableEmail();
    const address = {
      name: process.env.DEFAULT_NAME || 'Alex Mart',
      phone: process.env.DEFAULT_PHONE || '+91-9900990091',
      zip: process.env.DEFAULT_ZIP || '560037',
      street: process.env.DEFAULT_STREET || '24, alibahadur lake',
      city: process.env.DEFAULT_CITY || 'Bangalore',
      state: process.env.DEFAULT_STATE || 'Karnataka'
    };

    const result = await performFlow(page, config, email, address);
    Object.assign(flowStatus, result.flowStatus);

    await page.waitForTimeout(5000);
    await browser.close();

    return res.json({
      detected: evidence.length > 0,
      gateway_urls: [...new Set(evidence)],
      confidence: evidence.length ? 0.95 : 0,
      flow_status: flowStatus
    });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({
      error: err.message,
      detected: false,
      gateway_urls: [],
      confidence: 0,
      flow_status: flowStatus
    });
  }
});

app.get('/', (_, res) => {
  res.send('✅ PG Detector API is live');
});

app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
