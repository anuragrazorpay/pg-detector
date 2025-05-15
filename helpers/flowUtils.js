// Fills out login, product, cart, address, and checkout steps
export async function performFlow(page, config, email, address) {
  const flowStatus = {};

  try {
    // LOGIN (if required)
    if (config.login?.page) {
      await page.goto(config.login.page, { waitUntil: 'domcontentloaded' });
      await page.fill(config.login.emailField, email);
      await page.fill(config.login.passField, 'PgTest@123');
      await page.click(config.login.submitBtn);
      await page.waitForTimeout(3000);
      flowStatus.login = 'success';
    } else {
      flowStatus.login = 'skipped';
    }

    // PRODUCT PAGE
    await page.goto(config.product.page, { waitUntil: 'domcontentloaded' });
    if (config.product?.variantSel && config.product?.variantValue) {
      await page.selectOption(config.product.variantSel, config.product.variantValue);
    }
    await page.click(config.product.addBtnSel);
    await page.waitForTimeout(2000);
    flowStatus.add_to_cart = 'success';

    // ADDRESS STEP
    if (config.address?.zipField && config.address?.continueBtn) {
      await page.fill(config.address.zipField, address.zip);
      await page.click(config.address.continueBtn);
      await page.waitForTimeout(2000);
      flowStatus.address = 'success';
    } else {
      flowStatus.address = 'skipped';
    }

    // CHECKOUT
    if (config.checkout?.btnSel) {
      await page.click(config.checkout.btnSel);
      await page.waitForLoadState('networkidle');
      flowStatus.checkout = 'success';
    } else {
      flowStatus.checkout = 'skipped';
    }

  } catch (err) {
    flowStatus.error = err.message;
  }

  return { flowStatus };
}
