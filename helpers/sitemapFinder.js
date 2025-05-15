// helpers/sitemapFinder.js – universal product‑page finder (v2)
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import { URL } from 'url';

// Broad keyword seeds (do NOT try to list every niche word)
const PRODUCT_HINTS = [
  'product', 'item', 'shop', 'detail', 'goods', 'collections', 'p/',
  'buy', 'store', 'cart', 'add', 'sku', 'id=', 'pid='
];

export async function findProductPage(base) {
  const baseUrl = base.endsWith('/') ? base.slice(0, -1) : base;

  // 1️⃣  Try standard sitemap paths quickly
  const staticSm = [
    '/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml',
    '/sitemap-products.xml', '/sitemap_product.xml', '/sitemap_products_1.xml'
  ];
  for (const p of staticSm) {
    const hit = await scanSitemap(`${baseUrl}${p}`);
    if (hit) return hit;
  }

  // 2️⃣  Parse robots.txt for custom sitemaps
  for (const sm of await getRobotSitemaps(`${baseUrl}/robots.txt`)) {
    const hit = await scanSitemap(sm);
    if (hit) return hit;
  }

  // 3️⃣  Fetch home page / first‑level categories and score links heuristically
  return await scrapeHomeForProduct(baseUrl);
}

// ───────────────────────────────────────────────────────── helpers ────
async function scanSitemap(sitemapUrl) {
  try {
    const res = await fetch(sitemapUrl, { timeout: 15000 });
    if (!res.ok) return null;
    const xmlText = await res.text();
    const xml = await parseStringPromise(xmlText);
    const urls = extractUrls(xml);

    // simple heuristic: path contains hint OR looks like /xxx/yyy-zzz (has hyphen + ≥2 segments)
    return urls.find(u => isProductish(u));
  } catch {
    return null;
  }
}

function isProductish(url) {
  const lower = url.toLowerCase();
  if (PRODUCT_HINTS.some(h => lower.includes(h))) return true;
  const path = new URL(url).pathname;
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2 && /-/.test(path)) return true; // /category/product-name
  if (/\d{5,}/.test(path)) return true;                    // long numeric id in url
  if (path.endsWith('.html') || path.endsWith('.php')) return true;
  return false;
}

async function getRobotSitemaps(robotsUrl) {
  try {
    const res = await fetch(robotsUrl, { timeout: 10000 });
    if (!res.ok) return [];
    return res.text().then(body => body
      .split(/\r?\n/)
      .filter(line => line.toLowerCase().startsWith('sitemap:'))
      .map(l => l.split(':')[1].trim())
      .filter(u => u.startsWith('http'))
    );
  } catch { return []; }
}

async function scrapeHomeForProduct(baseUrl) {
  try {
    const res = await fetch(baseUrl, { timeout: 15000 });
    if (!res.ok) return null;
    const html = await res.text();
    const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
    for (const href of hrefs) {
      try {
        const abs = new URL(href, baseUrl).href;
        if (isProductish(abs)) return abs;
      } catch { /* ignore invalid */ }
    }
    return null;
  } catch { return null; }
}

function extractUrls(xml) {
  const out = [];
  if (xml.urlset?.url) {
    xml.urlset.url.forEach(u => typeof u.loc?.[0] === 'string' && out.push(u.loc[0]));
  }
  if (xml.sitemapindex?.sitemap) {
    xml.sitemapindex.sitemap.forEach(s => typeof s.loc?.[0] === 'string' && out.push(s.loc[0]));
  }
  return out;
}
