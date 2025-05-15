// helpers/flowUtils.js – resilient variant & add‑to‑cart handling
export async function performFlow(page, cfg, email, address) {
  const fs = {};

  /* 1️⃣  Login if configured */
  if (cfg.login?.page) {
    try {
      await page.goto(cfg.login.page, { waitUntil: 'domcontentloaded' });
      await page.fill(cfg.login.emailField, email);
      await page.fill(cfg.login.passField, 'PgTest@123');
      await page.click(cfg.login.submitBtn);
      await page.waitForLoadState('networkidle');
      fs.login = 'success';
    } catch (e) {
      fs.login = 'failed';
    }
  } else fs.login = 'skipped';

  /* 2️⃣  Product page already loaded by caller */
  fs.add_to_cart = await addToCart(page, cfg.product || {});

  /* 3️⃣  Address / ZIP (optional) */
  if (cfg.address?.zipField && cfg.address?.continueBtn) {
    try {
      await page.fill(cfg.address.zipField, address.zip);
      await page.click(cfg.address.continueBtn);
      await page.waitForLoadState('networkidle');
      fs.address = 'success';
    } catch (e) { fs.address = 'failed'; }
  } else fs.address = 'skipped';

  /* 4️⃣  Checkout navigation */
  if (cfg.checkout?.btnSel) {
    try {
      await page.click(cfg.checkout.btnSel);
      await page.waitForLoadState('networkidle');
      fs.checkout = 'success';
    } catch (e) { fs.checkout = 'failed'; }
  } else fs.checkout = 'skipped';

  return { flowStatus: fs };
}

async function addToCart(page, prodCfg) {
  try {
    // Variant selection if selector exists
    if (prodCfg.variantSel) {
      try {
        const sel = prodCfg.variantSel;
        await page.waitForSelector(sel, { timeout: 5000 });
        const firstOption = await page.$eval(sel, s => s.options[1]?.value || s.options[0].value);
        await page.selectOption(sel, prodCfg.variantValue || firstOption);
      } catch {/* variant optional */}
    }

    // Primary add‑to‑cart button
    const btnSel = prodCfg.addBtnSel || 'button:has-text("add to cart" i), button[name*="add" i]';
    await page.click(btnSel, { timeout: 10000 });
    await page.waitForTimeout(2000);
    return 'success';
  } catch {
    // Fallback: click first submit button
    try {
      await page.click('button[type="submit"]', { timeout: 5000 });
      return 'fallback';
    } catch {
      return 'failed';
    }
  }
}
