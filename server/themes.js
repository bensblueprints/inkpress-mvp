// Three server-rendered themes sharing one layout shell + partials.
// Zero-JS toggle (default ON) strips ALL <script> tags from public pages;
// when off, a tiny "copy code" enhancement script is added.

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BASE_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
img { max-width: 100%; display: block; }
.wrap { max-width: 720px; margin: 0 auto; padding: 0 24px; }
header.site { padding: 34px 0 18px; }
header.site .row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
header.site .brand { font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
header.site .brand:hover { text-decoration: none; }
header.site .tagline { font-size: 14px; opacity: .7; margin-top: 4px; }
nav.site-nav { display: flex; gap: 18px; flex-wrap: wrap; font-size: 14.5px; }
main { padding: 18px 0 70px; }
.post-list { display: flex; flex-direction: column; gap: 34px; margin-top: 20px; }
.post-item h2 { font-size: 24px; letter-spacing: -.01em; }
.post-item h2 a:hover { text-decoration: underline; }
.post-item .meta { font-size: 13px; opacity: .65; margin: 6px 0 10px; }
.post-item .excerpt { opacity: .85; line-height: 1.6; }
.post-item .cover { border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
.tags-inline { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.tags-inline a, .tag-pill { font-size: 12.5px; padding: 3px 10px; border-radius: 999px; opacity: .8; }
.tags-inline a:hover { text-decoration: none; opacity: 1; }
.pager { display: flex; justify-content: space-between; margin-top: 46px; font-size: 14.5px; }
article.post h1.title { font-size: 34px; letter-spacing: -.015em; line-height: 1.2; margin-bottom: 10px; }
article.post .meta { font-size: 13.5px; opacity: .65; margin-bottom: 26px; }
article.post .cover { border-radius: 12px; margin-bottom: 28px; overflow: hidden; }
.prose { font-size: 17px; line-height: 1.75; }
.prose h2 { font-size: 24px; margin: 38px 0 14px; letter-spacing: -.01em; }
.prose h3 { font-size: 19px; margin: 28px 0 10px; }
.prose p { margin: 16px 0; }
.prose ul, .prose ol { margin: 16px 0 16px 26px; }
.prose li { margin: 6px 0; }
.prose blockquote { border-left: 3px solid currentColor; opacity: .85; padding: 2px 20px; margin: 20px 0; }
.prose code { padding: 2px 6px; border-radius: 5px; font-size: .88em; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
.prose pre.shiki { padding: 18px 20px; border-radius: 10px; overflow-x: auto; margin: 20px 0; font-size: 14px; line-height: 1.6; position: relative; }
.prose pre.shiki code { padding: 0; background: none; font-size: inherit; }
.prose img { border-radius: 10px; margin: 20px 0; }
.prose hr { border: none; border-top: 1px solid currentColor; opacity: .2; margin: 34px 0; }
.prose table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 15px; }
.prose th, .prose td { border: 1px solid currentColor; border-opacity: .2; padding: 8px 12px; text-align: left; }
.copy-btn { position: absolute; top: 10px; right: 10px; font-size: 11.5px; padding: 4px 9px; border-radius: 6px; cursor: pointer; opacity: .7; border: 1px solid currentColor; background: transparent; color: inherit; }
.copy-btn:hover { opacity: 1; }
footer.site { padding: 40px 0 60px; font-size: 13.5px; opacity: .6; text-align: center; }
.empty { opacity: .6; padding: 40px 0; }
.err .code { font-size: 60px; font-weight: 800; letter-spacing: -.03em; opacity: .3; }
`;

const THEMES = {
  paper: {
    label: 'Paper',
    description: 'Light, serif, classic — a calm reading experience.',
    css: `
:root { color-scheme: light; }
body.theme-paper { background: #fbf9f4; color: #2a2620; font: 17px/1.7 Georgia, 'Times New Roman', serif; }
body.theme-paper a { color: #7a3b1e; }
body.theme-paper header.site { border-bottom: 1px solid #e7e0d2; }
body.theme-paper nav.site-nav a { color: #6b6455; }
body.theme-paper .post-item .meta, body.theme-paper article.post .meta { color: #8a8271; }
body.theme-paper .tag-pill, body.theme-paper .tags-inline a { background: #f0e9d8; color: #6b5a3a; }
body.theme-paper .prose code { background: #f0e9d8; }
body.theme-paper footer.site { border-top: 1px solid #e7e0d2; }
`
  },
  carbon: {
    label: 'Carbon',
    description: 'Dark, mono accents — a developer blog aesthetic.',
    css: `
:root { color-scheme: dark; }
body.theme-carbon { background: #0b0d10; color: #d9dee6; font: 16px/1.7 -apple-system, "Segoe UI", Inter, Roboto, sans-serif; }
body.theme-carbon a { color: #5fd0a3; }
body.theme-carbon header.site { border-bottom: 1px solid #1c2126; }
body.theme-carbon nav.site-nav a { color: #8b93a0; }
body.theme-carbon .post-item .meta, body.theme-carbon article.post .meta { color: #626b78; font-family: ui-monospace, monospace; }
body.theme-carbon .tag-pill, body.theme-carbon .tags-inline a { background: #151a1f; color: #5fd0a3; font-family: ui-monospace, monospace; }
body.theme-carbon .prose code { background: #151a1f; color: #e6e6e6; }
body.theme-carbon article.post h1.title, body.theme-carbon .post-item h2 { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
body.theme-carbon footer.site { border-top: 1px solid #1c2126; }
`
  },
  editorial: {
    label: 'Editorial',
    description: 'Magazine layout with large cover images.',
    css: `
:root { color-scheme: light; }
body.theme-editorial { background: #ffffff; color: #17181a; font: 17px/1.7 -apple-system, "Segoe UI", Inter, Roboto, sans-serif; }
body.theme-editorial a { color: #17181a; text-decoration: underline; text-underline-offset: 3px; }
body.theme-editorial header.site .brand { font-size: 26px; font-family: Georgia, serif; }
body.theme-editorial header.site { border-bottom: 2px solid #17181a; }
body.theme-editorial nav.site-nav a { color: #17181a; text-transform: uppercase; font-size: 12.5px; letter-spacing: .06em; }
body.theme-editorial .post-item .cover img, body.theme-editorial article.post .cover img { aspect-ratio: 16/9; object-fit: cover; width: 100%; }
body.theme-editorial .post-item h2 { font-family: Georgia, serif; font-size: 30px; }
body.theme-editorial article.post h1.title { font-family: Georgia, serif; font-size: 42px; }
body.theme-editorial .post-item .meta, body.theme-editorial article.post .meta { text-transform: uppercase; letter-spacing: .06em; font-size: 12px; color: #6b6b6b; }
body.theme-editorial .tag-pill, body.theme-editorial .tags-inline a { background: #17181a; color: #fff; text-decoration: none; }
body.theme-editorial .prose code { background: #f1f1f1; }
body.theme-editorial footer.site { border-top: 2px solid #17181a; }
`
  }
};

const COPY_JS = `
(function(){
  document.querySelectorAll('pre.shiki').forEach(function(pre){
    var btn = document.createElement('button');
    btn.className = 'copy-btn'; btn.type = 'button'; btn.textContent = 'Copy';
    btn.addEventListener('click', function(){
      var code = pre.querySelector('code');
      navigator.clipboard.writeText(code ? code.innerText : '').then(function(){
        btn.textContent = 'Copied!'; setTimeout(function(){ btn.textContent = 'Copy'; }, 1500);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
})();
`;

function navLinks(settings) {
  const links = Array.isArray(settings.nav) ? settings.nav : [];
  return links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join('');
}

function layout({ settings, title, description, body, path = '/', ogType = 'website', ogImage = '', extraHead = '' }) {
  const theme = THEMES[settings.theme] ? settings.theme : 'paper';
  const fullTitle = title ? `${title} — ${settings.site_title}` : `${settings.site_title} — ${settings.description}`;
  const desc = description || settings.description;
  const base = String(settings.base_url || '').replace(/\/+$/, '');
  const canonical = base ? `${base}${path}` : '';
  const zeroJs = settings.zero_js !== false;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:title" content="${esc(fullTitle)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="${esc(ogType)}" />
<meta property="og:site_name" content="${esc(settings.site_title)}" />
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />` : ''}
${canonical ? `<meta property="og:url" content="${esc(canonical)}" />\n<link rel="canonical" href="${esc(canonical)}" />` : ''}
<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(fullTitle)}" />
<meta name="twitter:description" content="${esc(desc)}" />
${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}" />` : ''}
<link rel="alternate" type="application/rss+xml" title="${esc(settings.site_title)}" href="${esc(base)}/rss.xml" />
<style>${BASE_CSS}${THEMES[theme].css}</style>
${extraHead}
</head>
<body class="theme-${theme}">
<header class="site"><div class="wrap row">
  <a class="brand" href="/">${esc(settings.site_title)}</a>
  <nav class="site-nav">${navLinks(settings)}</nav>
</div><div class="wrap tagline">${esc(settings.description)}</div></header>
${body}
<footer class="site"><div class="wrap">${settings.footer ? esc(settings.footer) : ''}</div></footer>
${!zeroJs ? `<script>${COPY_JS}</script>` : ''}
</body>
</html>`;
}

module.exports = { layout, esc, THEMES };
