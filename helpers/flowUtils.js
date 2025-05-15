// helpers/flowUtils.js – resilient variant, cart‑journey aware
export async function performFlow(page, cfg, email, address) {
  const fs = {};

  /* 1️⃣  Login */
  if (cfg.login?.page) {
    try {
      await page.goto(cfg.login.page, { waitUntil: 'domcontentloaded' });
      await page.fill(cfg.login.emailField, email);
      await page.fill(cfg.login.passField, 'PgTest@123');
      await page.click(cfg.login.submitBtn);
      await page.waitForLoadState('networkidle');
      fs.login = 'success';
    } catch { fs.login = 'failed'; }
  } else fs.login = 'skipped';

  /* 2️⃣  Add to cart */
  fs.add_to_cart = await addToCart(page, cfg.product || {});

  /* 3️⃣  Navigate to cart page if checkout not visible */
  if (fs.add_to_cart !== 'failed') {
    const checkoutInDom = await page.$('a[href*="checkout"], button:has-text("checkout" i)');
    if (!checkoutInDom) {
      // Try clicking cart icon/link
      const cartLinkSel = cfg.cart?.linkSel || '[href*="/cart" i], a[href*="/view-cart" i], a.cart-icon, button.cart-icon';
      try {
        await page.click(cartLinkSel, { timeout: 5000 });
        await page.waitForLoadState('networkidle');
        fs.cart_page = 'visited';
      } catch {
        fs.cart_page = 'skip';
      }
    } else fs.cart_page = 'skipped';
  }

  /* 4️⃣  Address step (optional) */
  if (cfg.address?.zipField && cfg.address?.continueBtn) {
    try {
      await page.fill(cfg.address.zipField, address.zip);
      await page.click(cfg.address.continueBtn);
      await page.waitForLoadState('networkidle');
      fs.address = 'success';
    } catch { fs.address = 'failed'; }
  } else fs.address = 'skipped';

  /* 5️⃣  Checkout */
  if (cfg.checkout?.btnSel) {
    try {
      await page.click(cfg.checkout.btnSel);
      await page.waitForLoadState('networkidle');
      fs.checkout = 'success';
    } catch {
      // fallback generic selectors
      try {
        await page.click('a[href*="checkout"], button:has-text("checkout" i)', { timeout: 7000 });
        await page.waitForLoadState('networkidle');
        fs.checkout = 'fallback';
      } catch { fs.checkout = 'failed'; }
    }
  } else fs.checkout = 'skipped';

  return { flowStatus: fs };
}

async function addToCart(page, prodCfg) {
  try {
    /* Variant selection logic unchanged */
    const selectSel = prodCfg.variantSel || 'select[name*=variant i], select[name*=size i]';
    const swatchSel = '[role="option"], li[data-variant-id], div[data-variant-id], button[data-variant-id]';
    if (await page.$(selectSel)) {
      const firstVal = await page.$eval(selectSel, s => s.options[1]?.value || s.options[0].value);
      await page.selectOption(selectSel, prodCfg.variantValue || firstVal);
    } else if (await page.$(swatchSel)) {
      await page.click(`${swatchSel} >> nth=0`);
    }

    /* Button list (expanded) */
    const defaultBtns = [
      /* ── common verb phrases ── */
      'button:has-text("add to cart" i)',
      'button:has-text("add to bag" i)',
      'button:has-text("add item" i)',
      'button:has-text("add basket" i)',
      'button:has-text("add to basket" i)',
      'button:has-text("add product" i)',
      'button:has-text("add to trolley" i)',
      'button:has-text("add now" i)',
      'button:has-text("buy now" i)',
      'button:has-text("buy it now" i)',
      'button:has-text("shop now" i)',
      'button:has-text("order now" i)',
      'button:has-text("bag it" i)',
      'button:has-text("purchase" i)',
      'button:has-text("checkout" i)',
      'button:has-text("proceed" i)',
      'button:has-text("subscribe" i)',
      /* ── span/div inside button ── */
      'button span:has-text("add" i)',
      'button div:has-text("add" i)',
      /* ── class / data attributes ── */
      'button[class*="addtocart" i]',
      'button[class*="add-to-cart" i]',
      'button[class*="addcart" i]',
      'button[class*="cart-btn" i]',
      'button[class*="btn-cart" i]',
      'button[class*="add-basket" i]',
      'button[class*="bag-btn" i]',
      '[data-addtocart], [data-add-to-cart], [data-action*="add" i]',
      '[data-button*="add" i]',
      '[aria-label*="add to cart" i]',
      '[aria-label*="add to bag" i]',
      /* ── anchor tag variants ── */
      'a:has-text("add to cart" i)',
      'a:has-text("buy now" i)',
      'a[class*="addtocart" i]',
      'a[data-addtocart]',
      /* ── generic regex catch‑all ── */
      'text=/\b(add|buy|order|shop|bag|cart|purchase|get|checkout|proceed)\b.*(now|item|bag|cart|it)?/i'
    ];
    const btnSel = prodCfg.addBtnSel || defaultBtns.join(', ');
    await page.click(btnSel, { timeout: 12000 });

    await Promise.race([
      page.waitForSelector('.cart-count:not(:empty), .mini-cart, [data-cart-count]', { timeout: 7000 }),
      page.waitForResponse(r => /add.*cart|cart\/add/i.test(r.url()), { timeout: 7000 })
    ]);
    return 'success';
  } catch {
    try {
      await page.click('button[type="submit"]', { timeout: 5000 });
      return 'fallback';
    } catch {
      return 'failed';
    }
  }
}
