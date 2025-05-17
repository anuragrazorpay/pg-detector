const { chromium } = require('playwright');
const logger = require('../helpers/logger');
const path = require('path');

async function detect(url) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const context = await browser.newContext({ recordHar: { path: path.join('output', `har-${Date.now()}.har`) } });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil:'networkidle', timeout:30000 });
    const frameUrls = page.frames().map(f => f.url()).filter(u => /checkout.*(razorpay|stripe|payu|cashfree|ccavenue)/i.test(u));
    await page.screenshot({ path: path.join('output', `screenshot-${Date.now()}.png`), fullPage:true });
    await context.close();
    await browser.close();
    return { evidence: frameUrls };
  } catch (err) {
    logger.error('Tier4 error', { url, err: err.message });
    await context.close();
    await browser.close();
    return { evidence: [], error: err.message };
  }
}

module.exports = { detect };
