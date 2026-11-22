// Usage: SITE_URL=https://example.com node scripts/generate-sitemap.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const site = (process.env.SITE_URL || "https://sociosquad.vercel.app").replace(/\/+$/, "");
const routes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/opportunities", priority: "0.9", changefreq: "daily" },
  { path: "/organizations", priority: "0.7", changefreq: "weekly" },
  { path: "/leaderboard", priority: "0.5", changefreq: "daily" },
];
const today = new Date().toISOString().slice(0, 10);
const urls = routes
  .map(
    (r) =>
      `  <url><loc>${site}${r.path}</loc><lastmod>${today}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
  )
  .join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/sitemap.xml");
writeFileSync(out, xml);
console.log(`Wrote ${out}`);
