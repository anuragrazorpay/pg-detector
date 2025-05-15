// helpers/sitemapFinder.js
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

const PRODUCT_HINTS = ['product', 'item', 'shop', 'detail', 'goods'];

export async function findProductPage(baseUrl) {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap_index.xml.gz`,
    `${baseUrl}/sitemap-product.xml`,
    `${baseUrl}/sitemap_products_1.xml`
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl, { timeout: 15000 });
      if (!res.ok) continue;
      const text = await res.text();
      const xml = await parseStringPromise(text);

      const urls = extractUrlsFromSitemap(xml);
      const productUrl = urls.find(url => PRODUCT_HINTS.some(hint => url.includes(hint)));
      if (productUrl) return productUrl;

    } catch (err) {
      continue; // try next sitemap
    }
  }

  return null; // fallback
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
