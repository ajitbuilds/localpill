import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for the production site
const BASE_URL = 'https://localpill.com';

// Define the static routes that are always present
const staticRoutes = [
    '/',
    '/setup',
    '/legal',
    '/disclaimer',
    '/privacy-policy',
    '/terms',
    '/grievance',
    '/how-it-works',
    '/about-us'
];

// Seed dynamic routes (Future: this would be fetched from Firestore, e.g., list of top medicines or cities)
const dynamicMedicineRoutes = [
    '/medicine/dolo-650',
    '/medicine/calpol-500',
    '/medicine/augmentin-625',
    '/medicine/crocin-advance',
    '/medicine/pan-d'
];

const dynamicPharmacyRoutes = [
    '/pharmacy/patna/boring-road',
    '/pharmacy/patna/kankarbagh',
    '/pharmacy/delhi/connaught-place'
];

const allRoutes = [...staticRoutes, ...dynamicMedicineRoutes, ...dynamicPharmacyRoutes];

// Generate the XML structure
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${staticRoutes.includes(route) ? 'monthly' : 'weekly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

// Write to public folder
const outputPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, sitemapXml, 'utf8');

console.log(`✅ Sitemap successfully generated at: ${outputPath}`);
console.log(`Total URLs mapped: ${allRoutes.length}`);
