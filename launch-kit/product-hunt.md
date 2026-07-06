# Product Hunt Launch — Inkpress

## Name
Inkpress

## Tagline (60 chars)
Your blog, in markdown, on your server — $29 forever

## Description (260 chars)
Inkpress is a self-hosted markdown blog engine that replaces Ghost. Split-pane markdown editor, 3 themes, zero-JS public pages, server-side syntax highlighting, RSS/sitemap/SEO built in, scheduled publishing. One-time $29 — runs on a $5 VPS or as a desktop app.

## Full description

Ghost is great software wrapped in a subscription you never stop paying. $9/month for the Starter plan, and it only goes up from there. For a blog that's fundamentally a folder of markdown files with a nice theme on top.

Inkpress is that blog, minus the rent:

- **Write** in a split-pane markdown editor with live preview rendered by the exact same pipeline that ships to production — no drift between what you see and what readers get
- **Publish** to genuinely zero-JavaScript public pages by default — pure server-rendered HTML/CSS, instant load, perfect for Hacker News traffic spikes
- **Style** with 3 built-in themes — Paper (light serif classic), Carbon (dark dev-blog), Editorial (magazine layout with big covers) — switch site-wide in one click
- **Highlight** code server-side with Shiki, so your code blocks look great with zero client bundle
- **Schedule** posts for the future — no cron job, they go live automatically the moment someone requests the page
- **Rank**: per-post SEO overrides, OG/Twitter cards, RSS 2.0, sitemap.xml, and a 301 redirect table so renaming a slug never breaks an inbound link

Run it two ways: as a Windows desktop app (Electron, zero setup) or on any $5 VPS with Docker. One SQLite file holds everything.

MIT-licensed source. $29 once for the packaged installer. No telemetry, no lock-in, no monthly bill.

## Maker first comment

Hey PH 👋

I got tired of paying $9-$25/month for Ghost to host what is, underneath the hood, markdown files and a theme. So I built Inkpress: write in a split-pane markdown editor, hit publish, and get a fast, zero-JS, SEO-ready blog you actually own.

The part I'm most proud of is the zero-JS default — public pages ship literally no `<script>` tag unless you opt into the tiny copy-code button. It's the kind of thing that plays really well with the HN crowd, and it means your blog survives a traffic spike without breaking a sweat.

The whole thing is one Node process and one SQLite file. Runs on a $5 VPS or as a plain Windows app if you don't want a server at all.

Source is MIT on GitHub. The one-time $29 gets you the 1-click installer + lifetime updates. Ask me anything — honest answers only.

## Gallery shots (5)

1. **Hero shot** — public blog home page in the Editorial theme: large cover image, magazine-style post list.
2. **Split-pane editor** — admin markdown editor, left pane markdown with a fenced code block, right pane live Shiki-highlighted preview, publish button visible.
3. **Theme picker** — Settings screen showing the 3 live theme thumbnails (Paper / Carbon / Editorial) side by side.
4. **Post page** — rendered article in the Carbon theme with a highlighted code block and OG-ready meta tags called out.
5. **Comparison card** — "Inkpress $29 once vs Ghost $9/mo → $324+ over 3 years" pricing graphic, with the desktop-app + VPS dual-mode diagram.
