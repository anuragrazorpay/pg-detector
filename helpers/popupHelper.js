// Dismisses cookie banners, modals, and overlays
export async function dismissPopups(page) {
  const selectors = [
    '[id*=cookie]', '[class*=cookie]', '[id*=consent]', '[class*=consent]',
    '[id*=gdpr]', '[class*=gdpr]', '[id*=banner]', '[class*=banner]',
    'button:has-text("Accept")', 'button:has-text("I Agree")', 'button:has-text("Close")'
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 1000 });
        await page.waitForTimeout(500);
      }
    } catch (err) {
      // Continue silently
    }
  }
}

// Scrolls page slowly to bottom to trigger lazy-loaded elements
export async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}
