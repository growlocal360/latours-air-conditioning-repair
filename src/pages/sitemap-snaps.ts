import type { APIRoute } from 'astro';
import { listPublishedSnaps } from '../lib/jobsnaps/queries';

export const prerender = false;

const SITE = 'https://latourshvac.com';

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const snaps = await listPublishedSnaps(5000);

  const urls = snaps.map((s) => {
    const loc = `${SITE}/work/${s.slug}`;
    const lastmod = s.updated_at || s.published_at || new Date().toISOString();
    return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${xmlEscape(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // 5-min edge cache: new snaps land in the sitemap within ~5 minutes
      // of publish without overloading the DB on every crawler hit.
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
};
