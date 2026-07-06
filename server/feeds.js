function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rfc822(iso) {
  const d = iso ? new Date(iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') + 'Z' : iso) : new Date();
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

// Full RSS 2.0 feed with content:encoded, latest N published posts.
function renderRss({ settings, posts, baseUrl }) {
  const base = String(baseUrl || settings.base_url || '').replace(/\/+$/, '');
  const items = posts
    .map((p) => {
      const link = `${base}/${p.slug}`;
      return `<item>
  <title>${esc(p.title)}</title>
  <link>${esc(link)}</link>
  <guid isPermaLink="true">${esc(link)}</guid>
  <pubDate>${rfc822(p.publish_at || p.created_at)}</pubDate>
  <description>${esc(p.excerpt || '')}</description>
  <content:encoded><![CDATA[${p.body_html_cache || ''}]]></content:encoded>
</item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${esc(settings.site_title)}</title>
  <link>${esc(base)}</link>
  <description>${esc(settings.description)}</description>
  <language>en</language>
${items}
</channel>
</rss>`;
}

function renderSitemap({ settings, posts, tags, baseUrl }) {
  const base = String(baseUrl || settings.base_url || '').replace(/\/+$/, '');
  const urls = [{ loc: `${base}/` }];
  for (const p of posts) urls.push({ loc: `${base}/${p.slug}`, lastmod: String(p.updated_at || p.created_at).slice(0, 10) });
  for (const t of tags) urls.push({ loc: `${base}/tag/${t.slug}` });
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    `\n</urlset>`;
  return xml;
}

function renderRobots({ settings, baseUrl }) {
  const base = String(baseUrl || settings.base_url || '').replace(/\/+$/, '');
  return `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${base}/sitemap.xml\n`;
}

module.exports = { renderRss, renderSitemap, renderRobots };
