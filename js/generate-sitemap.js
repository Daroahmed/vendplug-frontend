/*
 Simple sitemap generator for VendPlug
 Usage:
   BACKEND_URL=https://api.vendplug.com.ng PUBLIC_BASE_URL=https://vendplug.com.ng npm run generate:sitemap
 Defaults:
   BACKEND_URL -> http://localhost:5000
   PUBLIC_BASE_URL -> http://localhost:5000
*/

const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5000';

async function ensureFetch() {
  if (typeof fetch === 'function') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

async function fetchJson(url, { attempts = 3 } = {}) {
  const f = await ensureFetch();
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await f(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw lastErr || new Error('Request failed');
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function asISODate(obj) {
  const d = obj && (obj.updatedAt || obj.createdAt);
  try { return d ? new Date(d).toISOString() : null; } catch (_) { return null; }
}

async function tryEndpoints() {
  const endpoints = {
    products: [
      `${BACKEND_URL}/api/products?limit=2000`,
      `${BACKEND_URL}/api/vendor-products/public?limit=2000`,
      `${BACKEND_URL}/api/agent-products/public?limit=2000`
    ],
    vendors: [
      `${BACKEND_URL}/api/vendors?limit=2000`,
      `${BACKEND_URL}/api/vendors/public?limit=2000`
    ],
    agents: [
      `${BACKEND_URL}/api/agents?limit=2000`,
      `${BACKEND_URL}/api/agents/public?limit=2000`
    ]
  };

  async function getFirstOk(urls) {
    for (const u of urls) {
      try {
        const data = await fetchJson(u);
        // Normalize common API shapes
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.products)) return data.products;
        if (data && Array.isArray(data.items)) return data.items;
        if (data && data.success && Array.isArray(data.results)) return data.results;
      } catch (_) {
        // try next
      }
    }
    return [];
  }

  const [products, vendors, agents] = await Promise.all([
    getFirstOk(endpoints.products),
    getFirstOk(endpoints.vendors),
    getFirstOk(endpoints.agents)
  ]);

  return { products, vendors, agents };
}

function buildUrls({ products, vendors, agents }) {
  const urls = [];

  // Static/top pages
  urls.push({ loc: `${PUBLIC_BASE_URL}/`, priority: '1.0' });
  urls.push({ loc: `${PUBLIC_BASE_URL}/public-buyer-home.html`, priority: '0.9' });
  urls.push({ loc: `${PUBLIC_BASE_URL}/search-results.html`, priority: '0.8' });

  // Products
  for (const p of products) {
    const id = p._id || p.id;
    if (!id) continue;
    urls.push({
      loc: `${PUBLIC_BASE_URL}/product-detail.html?id=${encodeURIComponent(id)}`,
      lastmod: asISODate(p),
      priority: '0.7'
    });
  }

  // Vendors
  for (const v of vendors) {
    const id = v._id || v.id;
    if (!id) continue;
    urls.push({
      loc: `${PUBLIC_BASE_URL}/view-shop.html?vendor=${encodeURIComponent(id)}`,
      lastmod: asISODate(v)
    });
  }

  // Agents
  for (const a of agents) {
    const id = a._id || a.id;
    if (!id) continue;
    urls.push({
      loc: `${PUBLIC_BASE_URL}/view-business.html?agent=${encodeURIComponent(id)}`,
      lastmod: asISODate(a)
    });
  }

  return urls;
}

function buildSitemapXml(urls) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const u of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${xmlEscape(u.lastmod)}</lastmod>`);
    if (u.priority) lines.push(`    <priority>${xmlEscape(u.priority)}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}

async function main() {
  try {
    const { products, vendors, agents } = await tryEndpoints();
    const urls = buildUrls({ products, vendors, agents });
    const xml = buildSitemapXml(urls);
    const outPath = path.resolve(__dirname, '../sitemap.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log(`✅ sitemap.xml generated with ${urls.length} URLs -> ${outPath}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to generate sitemap:', e.message);
    process.exit(1);
  }
}

main();
