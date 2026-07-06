const { layout, esc } = require('./themes');

const PER_PAGE = 10;

function fmtDate(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function postTags(db, postId) {
  return db
    .prepare(`SELECT t.slug, t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ? ORDER BY t.name`)
    .all(postId);
}

function tagPills(tags) {
  return tags.length
    ? `<div class="tags-inline">${tags.map((t) => `<a class="tag-pill" href="/tag/${esc(t.slug)}">${esc(t.name)}</a>`).join('')}</div>`
    : '';
}

function postCard(db, p) {
  const tags = postTags(db, p.id);
  return `<div class="post-item">
    ${p.cover_path ? `<div class="cover"><a href="/${esc(p.slug)}"><img src="${esc(p.cover_path)}" alt="${esc(p.title)}" loading="lazy" /></a></div>` : ''}
    <h2><a href="/${esc(p.slug)}">${esc(p.title)}</a></h2>
    <div class="meta">${esc(fmtDate(p.status === 'published' ? (p.publish_at || p.created_at) : p.created_at))}</div>
    ${p.excerpt ? `<div class="excerpt">${esc(p.excerpt)}</div>` : ''}
    ${tagPills(tags)}
  </div>`;
}

function renderIndex({ settings, posts, page, totalPages, db }) {
  const list = posts.length
    ? `<div class="post-list">${posts.map((p) => postCard(db, p)).join('')}</div>`
    : `<p class="empty">No posts published yet.</p>`;
  const pager = totalPages > 1
    ? `<div class="pager">
        ${page > 1 ? `<a href="/?page=${page - 1}">← Newer</a>` : '<span></span>'}
        ${page < totalPages ? `<a href="/?page=${page + 1}">Older →</a>` : '<span></span>'}
      </div>`
    : '';
  const body = `<main><div class="wrap">${list}${pager}</div></main>`;
  return layout({ settings, title: '', description: settings.description, body, path: page > 1 ? `/?page=${page}` : '/' });
}

function renderPost({ settings, post, html, tags }) {
  const body = `<main><div class="wrap">
    <article class="post">
      ${post.cover_path ? `<div class="cover"><img src="${esc(post.cover_path)}" alt="${esc(post.title)}" /></div>` : ''}
      <h1 class="title">${esc(post.title)}</h1>
      <div class="meta">${esc(fmtDate(post.publish_at || post.created_at))} — ${esc(settings.author)}</div>
      <div class="prose">${html}</div>
      ${tagPills(tags)}
    </article>
  </div></main>`;
  return layout({
    settings,
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || settings.description,
    body,
    path: `/${post.slug}`,
    ogType: 'article',
    ogImage: post.cover_path ? `${String(settings.base_url || '').replace(/\/+$/, '')}${post.cover_path}` : ''
  });
}

function renderTag({ settings, tag, posts, db }) {
  const list = posts.length
    ? `<div class="post-list">${posts.map((p) => postCard(db, p)).join('')}</div>`
    : `<p class="empty">No posts tagged “${esc(tag.name)}” yet.</p>`;
  const body = `<main><div class="wrap">
    <h1 class="title" style="font-size:26px;margin-bottom:20px">Tag: ${esc(tag.name)}</h1>
    ${list}
  </div></main>`;
  return layout({ settings, title: `Tag: ${tag.name}`, description: `Posts tagged ${tag.name}`, body, path: `/tag/${tag.slug}` });
}

function render404({ settings }) {
  const body = `<main><div class="wrap">
    <div class="err">
      <div class="code">404</div>
      <h1 class="title" style="font-size:26px">Page not found</h1>
      <p style="margin-top:10px"><a href="/">← Back home</a></p>
    </div>
  </div></main>`;
  return layout({ settings, title: 'Page not found', body, path: '/404' });
}

module.exports = { renderIndex, renderPost, renderTag, render404, postTags, PER_PAGE, fmtDate };
