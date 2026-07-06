# Launch Strategy — Inkpress

## Target communities

- **r/selfhosted** — angle: "self-hosted Ghost alternative, one SQLite file, zero-JS public pages." This community actively hates SaaS lock-in and loves single-binary/single-file tools — lead with the Docker one-liner and the "your data, your server" framing. Respect self-promo rules: post as a genuine show-and-tell with a real screenshot, engage in comments instead of drive-by linking.
- **r/blogging** — angle: "I got tired of Ghost's monthly bill, built my own markdown blog engine." Less technical audience — lead with the writing experience (split-pane preview) and the money math, not the architecture.
- **r/webdev** — angle: the zero-JS technical decision + Shiki server-side highlighting + the dual Electron/VPS architecture. Post as a "here's how I built X" rather than a pure product pitch; webdev tolerates that framing far better than direct ads.
- **Hacker News "Show HN"** — the zero-JS angle plays extremely well here. Draft below.
- **r/Ghost** (small but relevant) and r/webhosting — secondary, lower-effort cross-posts once the main threads are live.

## Hacker News "Show HN" post draft

**Title:** Show HN: Inkpress – a markdown blog engine with zero-JS public pages

**Body:**
I got tired of paying Ghost $9/mo (and climbing) to host what amounts to markdown files with a theme, so I built Inkpress.

It's a self-hosted blog: write in a split-pane markdown editor (live preview uses the exact same server-side rendering pipeline that ships to production, so there's no drift), publish to server-rendered pages, done. Public pages ship **zero JavaScript** by default — no client framework, no hydration, no bundle — just HTML and CSS. There's a toggle if you want a tiny copy-code button, but that's the only JS in the whole public site.

Code blocks are highlighted server-side with Shiki at save time (cached in SQLite), so there's no client-side highlighting library either. Scheduled posts need no cron — the query just checks `publish_at <= now` and lazily flips the row on the next read.

Three built-in themes (light serif, dark dev-blog, magazine-style), RSS/sitemap/robots.txt, per-post SEO overrides, and a redirect table so renaming a slug doesn't 404 your old links.

Single SQLite file, single Node process. Runs on a $5 VPS with the included Dockerfile, or as a Windows desktop app if you don't want a server at all. Source is MIT. Happy to answer anything about the zero-JS rendering approach or the SQLite schema.

## SEO keywords (10)

1. ghost alternative self hosted
2. markdown blog engine
3. self hosted blog software
4. static blog generator alternative
5. zero javascript blog
6. self hosted CMS markdown
7. blog engine with themes
8. one time payment blog software
9. dev blog engine with syntax highlighting
10. self hosted RSS blog

## AppSumo / PitchGround pitch paragraph

Inkpress is a self-hosted markdown blog engine built for people who are done renting their publishing platform. Where Ghost charges $9–$25+/month forever, Inkpress is a one-time purchase: a split-pane markdown editor with live preview, three polished themes, server-side Shiki syntax highlighting, scheduled publishing with no cron required, and full SEO/RSS/sitemap support — all shipped as genuinely zero-JavaScript public pages for instant load times and perfect crawlability. It runs on any $5 VPS via the included Docker setup, or as a native Windows desktop app for writers who don't want a server at all. One SQLite file holds every post, tag, and setting — backups are a copy-paste. MIT-licensed source included with every purchase.

## Price math

Inkpress: **$29 once**
Ghost Starter: **$9/mo = $108/yr = $324 over 3 years**

Break-even: $29 / $9 ≈ **3.2 months**. After that, Inkpress is strictly cheaper for the life of the blog — $324+ saved over 3 years, growing every year after.
