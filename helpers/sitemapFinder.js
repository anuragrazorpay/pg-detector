// helpers/sitemapFinder.js – now with robots.txt + homepage fallback
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import { URL } from 'url';

const PRODUCT_HINTS = ['product', 'item', 'shop', 'detail', 'goods', 'collections', 'p/'];

export async function findProductPage(base) {
  const baseUrl = base.endsWith('/') ? base.slice(0, -1) : base;
  // 1. attempt hard‑coded sitemap paths
  const hardPaths = [
    '/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml',
    '/sitemap-products.xml', '/sitemap_product.xml', '/sitemap_products_1.xml'
  ];
  for (const p of hardPaths) {
    const prod = await trySitemap(`${baseUrl}${p}`);
    if (prod) return prod;
  }
  // 2. look inside robots.txt for Sitemap: lines
  const robots = await getRobotsSitemaps(`${baseUrl}/robots.txt`);
  for (const sm of robots) {
    const prod = await trySitemap(sm);
    if (prod) return prod;
  }
  // 3. homepage fallback: scrape links that look like products
  return await scrapeHomeForProduct(baseUrl);
}

// Fetch a sitemap URL and return first product‑looking link
async function trySitemap(url) {
  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) return null;
    const text = await res.text();
    const xml = await parseStringPromise(text);
    const urls = extractUrlsFromSitemap(xml);
    return urls.find(link => PRODUCT_HINTS.some(h => link.toLowerCase().includes(h)));
  } catch {
    return null;
  }
}

// Parse robots.txt for Sitemap: lines
async function getRobotsSitemaps(robotsUrl) {
  try {
    const out = [];
    const res = await fetch(robotsUrl, { timeout: 10000 });
    if (!res.ok) return out;
    const body = await res.text();
    body.split(/\r?\n/).forEach(line => {
      if (line.toLowerCase().startsWith('sitemap:')) {
        const sm = line.split(':')[1].trim();
        if (sm.startsWith('http')) out.push(sm);
      }
    });
    return out;
  } catch {
    return [];
  }
}

// Very light homepage scrape for product links
async function scrapeHomeForProduct(baseUrl) {
  try {
    const res = await fetch(baseUrl, { timeout: 15000 });
    if (!res.ok) return null;
    const html = await res.text();
    const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
    for (const href of hrefs) {
      if (PRODUCT_HINTS.some(h => href.includes(h))) {
        try {
          const abs = new URL(href, baseUrl).href;
          return abs;
        } catch { /* ignore */ }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractUrlsFromSitemap(xml) {
  const urls = [];
  if (xml.urlset?.url) {
    for (const entry of xml.urlset.url) {
      const loc = entry.loc?.[0];
      if (typeof loc === 'string') urls.push(loc);
    }
  } else if (xml.sitemapindex?.sitemap) {
    for (const entry of xml.sitemapindex.sitemap) {
      const loc = entry.loc?.[0];
      if (typeof loc === 'string') urls.push(loc);
    }
  }
  return urls;
}
