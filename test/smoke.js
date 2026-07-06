// Inkpress end-to-end smoke test: boots the real server on an ephemeral port,
// exercises the admin API + server-rendered public blog, and asserts every
// core MVP behavior from the build plan.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { XMLParser } = require('fast-xml-parser');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkpress-smoke-'));
const { createApp } = require('../server/app.js');

const PASSWORD = 'smoke-test-pw';
const BASE_URL = 'http://smoke.test';
let base = '';
let adminCookie = '';
const results = [];

function ok(name) {
  results.push(name);
  console.log(`  ✓ ${name}`);
}

async function req(method, url, { body, cookie, raw, formData } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + url, { method, headers, body: payload, redirect: 'manual' });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, json: raw ? null : safeJson(text) };
}
const safeJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

async function main() {
  const app = createApp({ dataDir, adminPassword: PASSWORD });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.on('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`Smoke test against ${base} (data: ${dataDir})\n`);

  // --- auth ---
  const bad = await req('POST', '/api/login', { body: { password: 'wrong' } });
  assert.strictEqual(bad.status, 401, 'wrong password rejected');
  const login = await req('POST', '/api/login', { body: { password: PASSWORD } });
  assert.strictEqual(login.status, 200);
  adminCookie = login.headers.get('set-cookie').split(';')[0];
  const noAuth = await req('GET', '/api/posts');
  assert.strictEqual(noAuth.status, 401, 'admin API requires auth');
  ok('admin auth: wrong password rejected, session cookie issued, API gated');

  // --- set base_url + zero_js on (default) via settings API ---
  await req('PUT', '/api/settings', { cookie: adminCookie, body: { base_url: BASE_URL, zero_js: true, site_title: 'Smoke Blog' } });

  // === 1) create post with H2, fenced js code block, image ref; publish ===
  const bodyMd = [
    '# Ignored H1',
    '',
    'This is the **first paragraph** used for the auto excerpt when left blank.',
    '',
    '## A Heading',
    '',
    'Some body text with an image below.',
    '',
    '![alt text](/uploads/placeholder.png)',
    '',
    '```js',
    "console.log('hello world');",
    '```'
  ].join('\n');

  const post = (await req('POST', '/api/posts', {
    cookie: adminCookie,
    body: { title: 'My First Post', body_md: bodyMd, status: 'published', cover_path: '/uploads/cover.png', tags: ['News', 'Tutorial'] }
  })).json;
  assert.strictEqual(post.slug, 'my-first-post');
  assert.strictEqual(post.status, 'published');
  assert.ok(post.excerpt.includes('first paragraph'), 'excerpt auto-generated from first paragraph');
  ok('created + published post via API with auto slug, auto excerpt, tags');

  // === 2) fetch /:slug -> assert rendering, highlighting, OG tags, canonical, zero-JS ===
  const page = await req('GET', `/${post.slug}`, { raw: true });
  assert.strictEqual(page.status, 200);
  assert.ok(page.text.includes('<h2'), 'H2 rendered');
  assert.ok(/class="shiki\b/.test(page.text), 'shiki-highlighted code block present');
  assert.ok(page.text.includes('property="og:title"'), 'og:title present');
  assert.ok(page.text.includes(`property="og:image" content="${BASE_URL}/uploads/cover.png"`), 'og:image uses cover + base url');
  assert.ok(page.text.includes(`rel="canonical" href="${BASE_URL}/${post.slug}"`), 'canonical link present');
  assert.ok(!/<script/.test(page.text), 'zero-JS: no <script> tag in HTML when toggle is on');
  ok('public post page renders markdown+shiki, OG tags, canonical URL, and ships zero JS');

  // === 3) upload a generated 3000px-wide PNG -> stored + resized <=2000px ===
  const bigPng = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: { r: 10, g: 120, b: 200 } } })
    .png()
    .toBuffer();
  const fd = new FormData();
  fd.append('file', new Blob([bigPng], { type: 'image/png' }), 'wide.png');
  const up = await req('POST', '/api/uploads', { cookie: adminCookie, formData: fd });
  assert.strictEqual(up.status, 200);
  assert.ok(up.json.url.startsWith('/uploads/'));
  assert.ok(up.json.width <= 2000, 'uploaded image resized to <= 2000px wide');
  const servedImg = await fetch(base + up.json.url);
  assert.strictEqual(servedImg.status, 200);
  const meta = await sharp(Buffer.from(await servedImg.arrayBuffer())).metadata();
  assert.ok(meta.width <= 2000, 'stored file itself is <= 2000px wide');
  ok('image upload stored, resized to <=2000px wide, and served from /uploads');

  // === 4) scheduled + draft posts absent from /, rss, sitemap; flip to past -> present ===
  const future = new Date(Date.now() + 3600 * 1000).toISOString();
  const scheduled = (await req('POST', '/api/posts', {
    cookie: adminCookie,
    body: { title: 'Future Post', body_md: 'Coming soon.', status: 'scheduled', publish_at: future }
  })).json;
  const draft = (await req('POST', '/api/posts', {
    cookie: adminCookie,
    body: { title: 'Draft Post', body_md: 'Not ready.', status: 'draft' }
  })).json;

  let home = await req('GET', '/', { raw: true });
  let rss = await req('GET', '/rss.xml', { raw: true });
  let sitemap = await req('GET', '/sitemap.xml', { raw: true });
  assert.ok(!home.text.includes(scheduled.slug) && !home.text.includes(draft.slug), 'scheduled+draft absent from index');
  assert.ok(!rss.text.includes(scheduled.slug) && !rss.text.includes(draft.slug), 'scheduled+draft absent from rss');
  assert.ok(!sitemap.text.includes(scheduled.slug) && !sitemap.text.includes(draft.slug), 'scheduled+draft absent from sitemap');
  const scheduledPagePre = await req('GET', `/${scheduled.slug}`, { raw: true });
  assert.strictEqual(scheduledPagePre.status, 404, 'scheduled post not yet public');

  // flip publish_at to the past -> should lazily flip to published and appear everywhere
  await req('PUT', `/api/posts/${scheduled.id}`, { cookie: adminCookie, body: { publish_at: new Date(Date.now() - 1000).toISOString() } });
  home = await req('GET', '/', { raw: true });
  rss = await req('GET', '/rss.xml', { raw: true });
  sitemap = await req('GET', '/sitemap.xml', { raw: true });
  assert.ok(home.text.includes(scheduled.slug), 'past-due scheduled post now on index');
  assert.ok(rss.text.includes(scheduled.slug), 'past-due scheduled post now in rss');
  assert.ok(sitemap.text.includes(scheduled.slug), 'past-due scheduled post now in sitemap');
  const scheduledStatus = (await req('GET', `/api/posts/${scheduled.id}`, { cookie: adminCookie })).json.status;
  assert.strictEqual(scheduledStatus, 'published', 'scheduled status lazily flipped to published');
  ok('scheduled/draft posts hidden until due; publish_at in the past lazily flips to published everywhere');

  // === 5) RSS 2.0 valid, item fields, content:encoded ===
  const rssFinal = await req('GET', '/rss.xml', { raw: true });
  const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });
  const rssDoc = parser.parse(rssFinal.text);
  assert.ok(rssDoc.rss, 'parses as valid RSS 2.0');
  const items = Array.isArray(rssDoc.rss.channel.item) ? rssDoc.rss.channel.item : [rssDoc.rss.channel.item];
  const item = items.find((i) => i.link === `${BASE_URL}/${post.slug}`);
  assert.ok(item, 'feed item for published post found');
  assert.ok(item.title && item.link && item.guid && item.pubDate, 'item has title/link/guid/pubDate');
  assert.strictEqual(item.description, post.excerpt, 'item description = excerpt');
  assert.ok(item['content:encoded'], 'item has content:encoded');
  ok('/rss.xml parses as valid RSS 2.0 with title/link/guid/pubDate/description/content:encoded');

  // === 6) sitemap parses, has post + tag URLs w/ BASE_URL; /tag/:slug lists post ===
  const sitemapDoc = parser.parse(sitemap.text);
  const urls = (Array.isArray(sitemapDoc.urlset.url) ? sitemapDoc.urlset.url : [sitemapDoc.urlset.url]).map((u) => u.loc);
  assert.ok(urls.includes(`${BASE_URL}/${post.slug}`), 'sitemap has post url with base url prefix');
  assert.ok(urls.includes(`${BASE_URL}/tag/news`), 'sitemap has tag url with base url prefix');
  const tagPage = await req('GET', '/tag/news', { raw: true });
  assert.strictEqual(tagPage.status, 200);
  assert.ok(tagPage.text.includes('My First Post'), 'tag page lists the tagged post');
  ok('sitemap.xml parses with post+tag URLs prefixed by BASE_URL; tag page lists post');

  // === 7) switch theme via settings API -> index HTML theme marker class differs ===
  const beforeThemeMatch = home.text.match(/theme-(\w+)/);
  await req('PUT', '/api/settings', { cookie: adminCookie, body: { theme: 'carbon' } });
  const afterTheme = await req('GET', '/', { raw: true });
  const afterThemeMatch = afterTheme.text.match(/theme-(\w+)/);
  assert.ok(beforeThemeMatch && afterThemeMatch && beforeThemeMatch[1] !== afterThemeMatch[1], 'theme marker class differs after switching theme');
  assert.strictEqual(afterThemeMatch[1], 'carbon');
  ok('switching theme via settings API changes the theme marker class on public pages');

  // --- bonus: slug rename creates a 301 redirect ---
  await req('PUT', '/api/settings', { cookie: adminCookie, body: { theme: 'paper' } });
  await req('PUT', `/api/posts/${post.id}`, { cookie: adminCookie, body: { slug: 'my-first-post-renamed' } });
  const oldSlugReq = await req('GET', `/${post.slug}`, { raw: true });
  assert.strictEqual(oldSlugReq.status, 301, 'old slug 301-redirects after rename');
  assert.strictEqual(oldSlugReq.headers.get('location'), '/my-first-post-renamed');
  const newSlugReq = await req('GET', '/my-first-post-renamed', { raw: true });
  assert.strictEqual(newSlugReq.status, 200);
  ok('renaming a post slug records a 301 redirect from the old slug');

  // --- bonus: robots.txt + empty-state pagination don't 500 ---
  const robots = await req('GET', '/robots.txt', { raw: true });
  assert.strictEqual(robots.status, 200);
  assert.ok(robots.text.includes('Sitemap:'));
  const emptyDb = fs.mkdtempSync(path.join(os.tmpdir(), 'inkpress-smoke-empty-'));
  const emptyApp = createApp({ dataDir: emptyDb, adminPassword: 'x' });
  const emptyServer = emptyApp.listen(0, '127.0.0.1');
  await new Promise((r) => emptyServer.on('listening', r));
  const emptyBase = `http://127.0.0.1:${emptyServer.address().port}`;
  const emptyHome = await fetch(`${emptyBase}/`);
  assert.strictEqual(emptyHome.status, 200, 'empty blog home does not 500');
  emptyServer.close();
  emptyApp.locals.db.close();
  fs.rmSync(emptyDb, { recursive: true, force: true });
  ok('robots.txt served; empty-state (no posts) home page renders without error');

  server.close();
  console.log(`\nAll ${results.length} smoke checks passed.`);
  try {
    app.locals.db.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch { /* leftover temp dir is harmless */ }
  process.exit(0);
}

main().catch((e) => {
  console.error('\nSMOKE TEST FAILED:', e);
  process.exit(1);
});
