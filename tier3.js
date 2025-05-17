const { chromium } = require('playwright');
const logger = require('../helpers/logger');

async function detect(url, schema) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const host = new URL(url).host;
    if (schema?.offers && host.includes('thewholetruthfoods.com')) {
      const variantId = schema.offers[0].sku;
      await page.evaluate(async id => {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ id, quantity:1 })
        });
      }, variantId);
      await page.waitForResponse(r => r.url().includes('/cart.js') && r.status()===200, { timeout:10000 });
      await page.goto(`https://${host}/checkout`, { waitUntil:'networkidle' });
    } else {
      await page.click('button:has-text("Add to cart")').catch(()=>{});
      await page.waitForTimeout(2000);
      await page.click('button:has-text("Checkout")').catch(()=>{});
    }
    const requests = [];
    page.on('request', req => {
      const u = req.url();
      if (/checkout.*(razorpay|stripe|payu|cashfree|ccavenue)/i.test(u)) requests.push(u);
    });
    await page.waitForTimeout(5000);
    await browser.close();
    return { evidence: requests };
  } catch (err) {
    logger.error('Tier3 error', { url, err: err.message });
    await browser.close();
    return { evidence: [], error: err.message };
  }
}

module.exports = { detect };
