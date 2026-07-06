// Markdown → HTML pipeline, shared by the admin live-preview (/api/preview) and
// post save (cached into posts.body_html_cache). Public pages never re-render
// markdown — they just serve the cached HTML, so this async pipeline never
// needs to run inside a hot public request.
const { marked } = require('marked');

let highlighterPromise = null;
async function getHighlighter() {
  if (!highlighterPromise) {
    const { createHighlighter } = require('shiki');
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: [
        'javascript', 'typescript', 'jsx', 'tsx', 'python', 'bash', 'shell',
        'json', 'css', 'html', 'sql', 'go', 'rust', 'yaml', 'markdown', 'plaintext', 'diff'
      ]
    }).catch((e) => {
      highlighterPromise = null;
      throw e;
    });
  }
  return highlighterPromise;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function highlightCode(code, lang) {
  try {
    const highlighter = await getHighlighter();
    const loaded = highlighter.getLoadedLanguages();
    const useLang = lang && loaded.includes(lang) ? lang : 'plaintext';
    return highlighter.codeToHtml(code, { lang: useLang, theme: 'github-dark' });
  } catch {
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

// marked's renderer.code hook is sync; we render markdown in two passes so the
// (async) shiki call can complete: first collect code blocks into placeholders,
// then swap the placeholders in after highlighting.
async function renderMarkdown(md) {
  const source = String(md || '');
  const blocks = [];
  const renderer = new marked.Renderer();
  renderer.code = (token) => {
    const code = token && typeof token === 'object' ? token.text : token;
    const lang = token && typeof token === 'object' ? token.lang : '';
    const i = blocks.length;
    blocks.push({ code, lang: String(lang || '').split(/\s+/)[0] });
    return `<!--INKPRESS-CODE-${i}-->`;
  };
  let html = marked.parse(source, { gfm: true, breaks: false, renderer });

  const rendered = await Promise.all(blocks.map((b) => highlightCode(b.code, b.lang)));
  html = html.replace(/<!--INKPRESS-CODE-(\d+)-->/g, (m, i) => rendered[Number(i)]);

  // Heading IDs for anchors/TOC-friendliness (not required by spec but harmless + useful).
  const used = new Map();
  html = html.replace(/<h([123])>([\s\S]*?)<\/h\1>/g, (m, level, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim();
    let id = slugifyHeading(text);
    const n = used.get(id) || 0;
    used.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });

  return html;
}

function slugifyHeading(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

// Plain-text excerpt (used for RSS description + meta description + auto-excerpt).
function mdToPlain(md, maxLen = 280) {
  const text = String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

// First real paragraph (skipping headings) for auto-excerpt when the excerpt field is blank.
function autoExcerpt(md, maxLen = 240) {
  const blocks = String(md || '').split(/\n\s*\n/);
  const firstPara = blocks.find((b) => !/^\s*#{1,6}\s+/.test(b.trim()) && b.trim()) || blocks[0] || '';
  return mdToPlain(firstPara, maxLen);
}

module.exports = { renderMarkdown, mdToPlain, autoExcerpt, getHighlighter };
