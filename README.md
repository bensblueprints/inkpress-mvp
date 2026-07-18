# ✒️ Inkpress — Self-Hosted Markdown Blog Engine

## Demo



https://github.com/user-attachments/assets/c6f596ac-11eb-40b3-88b9-f486369dd43d



[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Pay once. Own it forever. No subscription.**

Inkpress is a complete, self-hosted markdown blog — the kind you'd pay Ghost **$9/month ($108/yr)** for, running on your own hardware or a $5 VPS. Write in markdown with a live split-pane preview, publish to blazing-fast **server-rendered, zero-JavaScript pages**, and keep full ownership of your writing in one SQLite file.

![Inkpress screenshot](docs/screenshot.png)

## ✨ Features

**Public blog (server-rendered, SEO-first)**
- ⚡ Zero-JS pages by default — pure HTML/CSS, no client framework, instant load, perfect Lighthouse scores
- 🎨 3 built-in themes — **Paper** (light serif classic), **Carbon** (dark, dev-blog mono), **Editorial** (magazine, large covers) — switch site-wide instantly in Settings
- 🖍️ Server-side syntax highlighting via Shiki — code blocks look great with no client JS
- 🏷️ Tags with dedicated tag pages and nav
- 📡 `/rss.xml` (latest 20 posts, full HTML in `content:encoded`), `/sitemap.xml`, `robots.txt`
- 🔍 SEO done right: per-post meta title/description overrides, OG + Twitter card tags, canonical URLs
- 🔗 Slug-rename 301 redirect table — never break an inbound link again

**Admin dashboard**
- ✍️ Markdown editor with **split-pane live preview**, rendered by the exact same pipeline as the public site
- 🖼️ Drag/paste image upload, auto-resized to a sane max width via `sharp`
- 📅 Draft / scheduled / published workflow — scheduled posts go live automatically, no cron needed
- 📝 Excerpt field, auto-generated from the first paragraph when left blank (used in RSS + meta description)
- 🎛️ Site settings: title, description, author, base URL, theme picker with live thumbnails, nav editor, zero-JS toggle

**Ops**
- 🗄️ Single SQLite file — trivial backups, no database server
- 🐳 Dockerfile + docker-compose included
- 🖥️ **Desktop mode** — run the whole thing as a Windows app, no server needed
- 🔒 100% local, zero telemetry, no external services

## 🚀 Quick start

```bash
npm i
npm run build   # build the admin UI
npm start       # → http://localhost:5330  (admin at /admin, password "admin")
```

Set a real password and base URL before deploying — copy `.env.example` to `.env` and edit `ADMIN_PASSWORD` + `BASE_URL`. **`BASE_URL` matters**: it's used to build absolute links in RSS, sitemap.xml, and OG tags — Settings shows a banner if it's unset.

**Run it as a desktop app, or deploy to a $5 VPS when you need it public.**

```bash
npm run desktop        # Electron app, data stored in your user profile, auto-logged-in
```

**Docker (VPS):**

```bash
ADMIN_PASSWORD=your-secret BASE_URL=https://blog.example.com docker compose up -d
```

## 🖥️ Two modes, one codebase

| Mode | How | Data lives in |
|---|---|---|
| Desktop app | `npm run desktop` (or the NSIS installer via `npm run dist`) | Electron `userData` dir |
| VPS / self-hosted web | `npm run build && npm start` or Docker | `./data` (or `DATA_DIR`) |

The Electron wrapper boots the identical Express server on a free local port and opens a window already logged in as admin — nothing forked, nothing duplicated.

## 💰 vs. the subscription tools

| | **Inkpress** | Ghost (Starter) | WordPress.com | Substack |
|---|---|---|---|---|
| Price | **$29 once** | $9/mo ($108/yr) | $4–$45/mo | Free, but 10% of paid subs |
| Your data | Your server, one SQLite file | Their cloud (self-host tier is DIY too) | Their cloud | Their cloud |
| Zero-JS public pages | ✅ | ❌ | ❌ | ❌ |
| Custom themes | ✅ 3 built-in, edit the code | Paid/limited | Paid tiers | ❌ |
| Remove "Powered by" | ✅ It's your code | Paid tier | Paid tier | ❌ |
| Works offline / air-gapped | ✅ | ❌ | ❌ | ❌ |
| Price after 3 years | **Still $29** | $324+ | $144–$1,620+ | Ongoing % of revenue |

**Pays for itself in ~3.2 months** vs. Ghost's $9/mo Starter plan.

## ☕ Skip the setup — get the 1-click installer

Don't want to touch a terminal? Grab the packaged Windows installer (plus lifetime updates) on Whop:

**→ [https://whop.com/onetime-suite](https://whop.com/onetime-suite)**

## 🛠️ Tech stack

- **Server:** Node 20+, Express, better-sqlite3 (WAL), marked, Shiki (server-side syntax highlighting), sharp (image resize)
- **Public site:** server-rendered HTML (zero JS framework → fast + SEO-perfect), no client bundle at all
- **Admin:** React 18, Vite, Tailwind CSS 4, Framer Motion, Lucide icons
- **Desktop:** Electron wrapper around the same server, electron-builder NSIS config

## 🧪 Tests

```bash
npm test
```

Boots a real server on a temp database and verifies: auth, post CRUD with auto-slug/auto-excerpt/tags, markdown → HTML with Shiki-highlighted code blocks, OG/canonical tags, zero-JS output (no `<script>` on public pages), image upload + resize-to-2000px, scheduled/draft visibility (including the lazy publish-at flip), valid RSS 2.0 with `content:encoded`, sitemap.xml with post + tag URLs, tag pages, theme switching, slug-rename 301 redirects, and empty-state pagination.

## 📄 License

MIT — see [LICENSE](LICENSE).
