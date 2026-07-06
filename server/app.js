const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const sharp = require('sharp');
const {
  openDb, getSettings, setSettings, uniqueSlug, resolveScheduled, recordRedirect
} = require('./db');
const { renderMarkdown, autoExcerpt } = require('./markdown');
const pages = require('./public-pages');
const feeds = require('./feeds');

const MAX_IMAGE_WIDTH = 2000;

function createApp(opts = {}) {
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const adminPassword = opts.adminPassword || process.env.ADMIN_PASSWORD || 'admin';
  const autologinToken = opts.autologinToken || process.env.AUTOLOGIN_TOKEN || null;

  const db = openDb(dataDir);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // ---- sessions (persisted so a restart doesn't nuke the admin's login) ----
  function newSession(res) {
    const sid = crypto.randomBytes(24).toString('hex');
    db.prepare('INSERT INTO sessions (id) VALUES (?)').run(sid);
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    return sid;
  }
  function hasSession(sid) {
    return !!sid && !!db.prepare('SELECT id FROM sessions WHERE id = ?').get(sid);
  }
  function requireAuth(req, res, next) {
    if (hasSession(req.cookies.sid)) return next();
    res.status(401).json({ error: 'Unauthorized' });
  }

  // ---- uploads ----
  const uploadsDir = path.join(dataDir, 'uploads');
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype))
  });
  app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));

  // ---- tag helpers ----
  function setPostTags(postId, tagNames) {
    db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId);
    const names = [...new Set((tagNames || []).map((t) => String(t).trim()).filter(Boolean))];
    for (const name of names) {
      let tag = db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name);
      if (!tag) {
        const slug = uniqueSlug(db, 'tags', name);
        const info = db.prepare('INSERT INTO tags (slug, name) VALUES (?, ?)').run(slug, name);
        tag = { id: info.lastInsertRowid, slug, name };
      }
      db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(postId, tag.id);
    }
  }

  function fullPost(id) {
    const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!p) return null;
    return { ...p, tags: pages.postTags(db, p.id) };
  }

  function effectiveBaseUrl(req) {
    return settingsBaseUrl() || `${req.protocol}://${req.get('host')}`;
  }
  function settingsBaseUrl() {
    const s = getSettings(db);
    return s.base_url ? s.base_url.replace(/\/+$/, '') : '';
  }

  // ================= AUTH =================

  app.post('/api/login', (req, res) => {
    const pw = String(req.body?.password || '');
    const a = Buffer.from(pw);
    const b = Buffer.from(adminPassword);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });
    newSession(res);
    res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    if (req.cookies.sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(req.cookies.sid);
    res.clearCookie('sid');
    res.json({ ok: true });
  });

  app.get('/api/me', (req, res) => res.json({ authed: hasSession(req.cookies.sid) }));

  if (autologinToken) {
    app.get('/auth/auto', (req, res) => {
      if (req.query.token !== autologinToken) return res.status(403).send('Forbidden');
      newSession(res);
      res.redirect('/admin');
    });
  }

  // ================= ADMIN API =================

  app.get('/api/settings', requireAuth, (req, res) => res.json(getSettings(db)));
  app.put('/api/settings', requireAuth, (req, res) => {
    setSettings(db, req.body || {});
    res.json(getSettings(db));
  });

  app.get('/api/tags', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM tags ORDER BY name').all());
  });

  app.post('/api/uploads', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image received (png/jpg/webp/gif/avif, max 20MB)' });
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      let pipeline = sharp(req.file.buffer);
      const meta = await pipeline.metadata();
      if (meta.width && meta.width > MAX_IMAGE_WIDTH) {
        pipeline = pipeline.resize({ width: MAX_IMAGE_WIDTH });
      }
      const ext = (meta.format === 'jpeg' ? 'jpg' : meta.format) || 'png';
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const outPath = path.join(uploadsDir, filename);
      const info = await pipeline.toFile(outPath);
      db.prepare('INSERT INTO uploads (path, width, height, bytes) VALUES (?, ?, ?, ?)').run(
        `/uploads/${filename}`, info.width, info.height, info.size
      );
      res.json({ url: `/uploads/${filename}`, width: info.width, height: info.height });
    } catch (e) {
      res.status(400).json({ error: 'Could not process image: ' + e.message });
    }
  });

  app.get('/api/uploads', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM uploads ORDER BY id DESC').all());
  });

  // live-preview renderer for the split-pane editor (same pipeline used at save time)
  app.post('/api/preview', requireAuth, async (req, res) => {
    const html = await renderMarkdown(String(req.body?.md || ''));
    res.json({ html });
  });

  // ---- posts ----
  app.get('/api/posts', requireAuth, (req, res) => {
    const status = req.query.status;
    const q = req.query.q ? `%${String(req.query.q)}%` : null;
    let sql = 'SELECT id, slug, title, excerpt, status, publish_at, cover_path, created_at, updated_at FROM posts WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (q) { sql += ' AND (title LIKE ? OR body_md LIKE ?)'; params.push(q, q); }
    sql += ' ORDER BY updated_at DESC';
    res.json(db.prepare(sql).all(...params));
  });

  app.get('/api/posts/:id', requireAuth, (req, res) => {
    const p = fullPost(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  });

  function computeStatus(body) {
    const status = body.status;
    if (status === 'scheduled' && body.publish_at && new Date(body.publish_at) <= new Date()) return 'published';
    return ['draft', 'scheduled', 'published'].includes(status) ? status : 'draft';
  }

  app.post('/api/posts', requireAuth, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title required' });
    const bodyMd = String(req.body?.body_md || '');
    const slug = uniqueSlug(db, 'posts', req.body?.slug || title);
    const status = computeStatus(req.body || {});
    const html = await renderMarkdown(bodyMd);
    const excerpt = String(req.body?.excerpt || '').trim() || autoExcerpt(bodyMd);
    const info = db.prepare(
      `INSERT INTO posts (slug, title, body_md, body_html_cache, excerpt, cover_path, status, publish_at, meta_title, meta_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      slug, title, bodyMd, html, excerpt,
      String(req.body?.cover_path || ''), status, req.body?.publish_at || null,
      String(req.body?.meta_title || ''), String(req.body?.meta_description || '')
    );
    setPostTags(info.lastInsertRowid, req.body?.tags);
    res.status(201).json(fullPost(info.lastInsertRowid));
  });

  app.put('/api/posts/:id', requireAuth, async (req, res) => {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const title = String(req.body?.title ?? existing.title).trim() || existing.title;
    const bodyMd = req.body?.body_md ?? existing.body_md;
    const slug = req.body?.slug ? uniqueSlug(db, 'posts', req.body.slug, existing.id) : existing.slug;
    const status = req.body?.status ? computeStatus(req.body) : existing.status;
    const html = req.body?.body_md !== undefined ? await renderMarkdown(bodyMd) : existing.body_html_cache;
    const excerpt = req.body?.excerpt !== undefined
      ? (String(req.body.excerpt).trim() || autoExcerpt(bodyMd))
      : existing.excerpt;
    db.prepare(
      `UPDATE posts SET slug=?, title=?, body_md=?, body_html_cache=?, excerpt=?, cover_path=?, status=?, publish_at=?,
       meta_title=?, meta_description=?, updated_at=datetime('now') WHERE id=?`
    ).run(
      slug, title, bodyMd, html, excerpt,
      String(req.body?.cover_path ?? existing.cover_path), status,
      req.body?.publish_at !== undefined ? req.body.publish_at : existing.publish_at,
      String(req.body?.meta_title ?? existing.meta_title), String(req.body?.meta_description ?? existing.meta_description),
      existing.id
    );
    if (req.body?.tags !== undefined) setPostTags(existing.id, req.body.tags);
    if (slug !== existing.slug) recordRedirect(db, existing.slug, slug);
    res.json(fullPost(existing.id));
  });

  app.delete('/api/posts/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ================= PUBLIC =================

  const publishedList = () => {
    resolveScheduled(db);
    return db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY COALESCE(publish_at, created_at) DESC").all();
  };

  app.get('/', (req, res) => {
    const settings = getSettings(db);
    const all = publishedList();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const totalPages = Math.max(1, Math.ceil(all.length / pages.PER_PAGE));
    const slice = all.slice((page - 1) * pages.PER_PAGE, page * pages.PER_PAGE);
    res.type('html').send(pages.renderIndex({ settings, posts: slice, page, totalPages, db }));
  });

  app.get('/tag/:slug', (req, res, next) => {
    const tag = db.prepare('SELECT * FROM tags WHERE slug = ?').get(req.params.slug);
    if (!tag) return next();
    resolveScheduled(db);
    const posts = db.prepare(
      `SELECT p.* FROM posts p JOIN post_tags pt ON pt.post_id = p.id
       WHERE pt.tag_id = ? AND p.status = 'published' ORDER BY COALESCE(p.publish_at, p.created_at) DESC`
    ).all(tag.id);
    const settings = getSettings(db);
    res.type('html').send(pages.renderTag({ settings, tag, posts, db }));
  });

  app.get('/rss.xml', (req, res) => {
    const settings = getSettings(db);
    const posts = publishedList().slice(0, 20);
    res.type('application/xml').send(feeds.renderRss({ settings, posts, baseUrl: effectiveBaseUrl(req) }));
  });

  app.get('/sitemap.xml', (req, res) => {
    const settings = getSettings(db);
    const posts = publishedList();
    const tags = db.prepare('SELECT slug FROM tags ORDER BY slug').all();
    res.type('application/xml').send(feeds.renderSitemap({ settings, posts, tags, baseUrl: effectiveBaseUrl(req) }));
  });

  app.get('/robots.txt', (req, res) => {
    const settings = getSettings(db);
    res.type('text/plain').send(feeds.renderRobots({ settings, baseUrl: effectiveBaseUrl(req) }));
  });

  // ================= ADMIN SPA =================
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use('/admin', express.static(distDir));
    app.get('/admin/*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    app.get('/admin', (req, res) =>
      res.status(503).type('html').send('<h1>Admin UI not built</h1><p>Run <code>npm run build</code> first.</p>')
    );
  }

  // ---- individual post page + 301 redirect table for renamed slugs (must be last: catch-all) ----
  app.get('/:slug', (req, res, next) => {
    if (req.params.slug.includes('.')) return next(); // let static-ish paths 404 normally
    resolveScheduled(db);
    const post = db.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").get(req.params.slug);
    if (post) {
      const settings = getSettings(db);
      const tags = pages.postTags(db, post.id);
      return res.type('html').send(pages.renderPost({ settings, post, html: post.body_html_cache, tags }));
    }
    const redirect = db.prepare('SELECT new_slug FROM redirects WHERE old_slug = ?').get(req.params.slug);
    if (redirect) return res.redirect(301, `/${redirect.new_slug}`);
    return next();
  });

  // ================= 404 =================
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    const settings = getSettings(db);
    res.status(404).type('html').send(pages.render404({ settings }));
  });

  app.locals.db = db;
  return app;
}

module.exports = { createApp };
