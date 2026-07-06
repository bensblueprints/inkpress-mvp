const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function nativeBindingPath() {
  // Under Electron the Node-ABI binding won't load; use the vendored Electron prebuild.
  if (!process.versions.electron) return null;
  const p = path.join(__dirname, '..', 'vendor', 'better_sqlite3-electron.node')
    .replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
  return fs.existsSync(p) ? p : null;
}

function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });
  const nativeBinding = nativeBindingPath();
  const db = new Database(path.join(dataDir, 'app.db'), nativeBinding ? { nativeBinding } : {});
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body_md TEXT NOT NULL DEFAULT '',
      body_html_cache TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      cover_path TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',        -- draft | scheduled | published
      publish_at TEXT,                              -- ISO datetime, used when status = scheduled
      meta_title TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      bytes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_slug TEXT NOT NULL UNIQUE,
      new_slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);
  `);

  return db;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

// Ensure slug uniqueness within a table (appends -2, -3, ... when taken).
function uniqueSlug(db, table, desired, excludeId = null) {
  let base = slugify(desired);
  let slug = base;
  let i = 1;
  for (;;) {
    const row = excludeId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(slug, excludeId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug);
    if (!row) return slug;
    i++;
    slug = `${base}-${i}`;
  }
}

const DEFAULT_SETTINGS = {
  site_title: 'Inkpress',
  description: 'Thoughts, notes, and write-ups.',
  author: 'Anonymous',
  base_url: '',                    // canonical base URL for RSS/sitemap/OG; warn if unset in prod
  theme: 'paper',                  // paper | carbon | editorial
  zero_js: 'true',                 // stored as text ('true'/'false') for simple settings table
  nav_json: '[]',                  // [{label, url}]
  footer: `Powered by Inkpress`
};

function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  out.zero_js = out.zero_js === 'true' || out.zero_js === true;
  try {
    out.nav = JSON.parse(out.nav_json || '[]');
  } catch {
    out.nav = [];
  }
  return out;
}

function setSettings(db, obj) {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) {
      if (k === 'nav') {
        stmt.run('nav_json', JSON.stringify(Array.isArray(v) ? v : []));
      } else if (k === 'zero_js') {
        stmt.run('zero_js', v ? 'true' : 'false');
      } else if (k in DEFAULT_SETTINGS) {
        stmt.run(k, String(v ?? ''));
      }
    }
  });
  tx(Object.entries(obj));
}

// Lazily flip due scheduled posts to published. Call before any public-facing query.
function resolveScheduled(db) {
  // publish_at is stored as whatever the client sent (usually ISO8601 with 'T'/'Z'); normalize
  // both sides through datetime() so the comparison is correct regardless of separator/format
  // differences between ISO strings and SQLite's own 'YYYY-MM-DD HH:MM:SS' format.
  db.prepare(
    `UPDATE posts SET status = 'published', updated_at = datetime('now')
     WHERE status = 'scheduled' AND publish_at IS NOT NULL AND datetime(publish_at) <= datetime('now')`
  ).run();
}

// Record a 301 redirect from an old slug to the post's current slug (chains collapse to final).
function recordRedirect(db, oldSlug, newSlug) {
  if (!oldSlug || oldSlug === newSlug) return;
  // repoint anything that used to redirect to oldSlug, straight to the new one
  db.prepare('UPDATE redirects SET new_slug = ? WHERE new_slug = ?').run(newSlug, oldSlug);
  db.prepare(
    'INSERT INTO redirects (old_slug, new_slug) VALUES (?, ?) ON CONFLICT(old_slug) DO UPDATE SET new_slug = excluded.new_slug'
  ).run(oldSlug, newSlug);
}

module.exports = {
  openDb, getSettings, setSettings, DEFAULT_SETTINGS,
  slugify, uniqueSlug, resolveScheduled, recordRedirect
};
