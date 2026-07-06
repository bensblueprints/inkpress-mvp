import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Bold, Link as LinkIcon, Image as ImageIcon, Code, ArrowLeft, Loader2, Upload } from 'lucide-react';
import { api } from './api.js';

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function Editor({ postId, onBack }) {
  const [post, setPost] = useState({
    title: '', slug: '', body_md: '', excerpt: '', cover_path: '',
    status: 'draft', publish_at: '', meta_title: '', meta_description: '', tags: []
  });
  const [tagsText, setTagsText] = useState('');
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);
  const [slugTouched, setSlugTouched] = useState(!!postId);
  const textareaRef = useRef(null);
  const previewTimer = useRef(null);

  useEffect(() => {
    if (!postId) return;
    api.get(`/api/posts/${postId}`).then((p) => {
      setPost(p);
      setTagsText((p.tags || []).map((t) => t.name).join(', '));
      setLoading(false);
    });
  }, [postId]);

  const renderPreview = useCallback((md) => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      const { html } = await api.post('/api/preview', { md });
      setPreview(html);
    }, 300);
  }, []);

  useEffect(() => { renderPreview(post.body_md); }, [post.body_md, renderPreview]);

  function update(field, value) {
    setPost((p) => ({ ...p, [field]: value }));
    if (field === 'title' && !slugTouched) {
      setPost((p) => ({ ...p, title: value, slug: slugify(value) }));
    }
  }

  function insertAtCursor(before, after = '') {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
    update('body_md', next);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + before.length; });
  }

  async function uploadCover(file) {
    const { url } = await api.upload(file);
    update('cover_path', url);
  }

  async function uploadInline(file) {
    const { url } = await api.upload(file);
    insertAtCursor(`![${file.name}](${url})`);
  }

  async function save(overrides = {}) {
    setSaving(true);
    try {
      const payload = {
        ...post, ...overrides,
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean)
      };
      if (postId) {
        await api.put(`/api/posts/${postId}`, payload);
      } else {
        const created = await api.post('/api/posts', payload);
        onBack(created.id);
        return;
      }
      onBack(postId);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-zinc-600" size={26} /></div>;
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <button onClick={() => onBack()} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            disabled={saving}
            onClick={() => save({ status: 'draft' })}
            className="rounded-lg border border-zinc-700 px-3.5 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Save draft
          </button>
          <button
            disabled={saving}
            onClick={() => save({ status: post.publish_at && new Date(post.publish_at) > new Date() ? 'scheduled' : 'published' })}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {post.publish_at && new Date(post.publish_at) > new Date() ? 'Schedule' : 'Publish'}
          </button>
        </div>
      </div>

      <input
        value={post.title}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Post title"
        className="mb-1 w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-zinc-600"
      />
      <div className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500">
        /
        <input
          value={post.slug}
          onChange={(e) => { setSlugTouched(true); update('slug', slugify(e.target.value)); }}
          className="bg-transparent outline-none focus:text-zinc-200"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-2 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5">
            <button onClick={() => insertAtCursor('**', '**')} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"><Bold size={15} /></button>
            <button onClick={() => insertAtCursor('[', '](url)')} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"><LinkIcon size={15} /></button>
            <button onClick={() => insertAtCursor('`', '`')} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"><Code size={15} /></button>
            <label className="cursor-pointer rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <ImageIcon size={15} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadInline(e.target.files[0])} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <textarea
              ref={textareaRef}
              value={post.body_md}
              onChange={(e) => update('body_md', e.target.value)}
              onPaste={(e) => {
                const file = [...(e.clipboardData?.files || [])][0];
                if (file && file.type.startsWith('image/')) { e.preventDefault(); uploadInline(file); }
              }}
              placeholder="Write your post in markdown…"
              className="h-[70vh] min-h-[420px] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-zinc-200 outline-none focus:border-emerald-600"
            />
            <div
              className="prose prose-invert h-[70vh] min-h-[420px] max-w-none overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</div>
            <select
              value={post.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-white outline-none"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
          {post.status === 'scheduled' && (
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Publish date</div>
              <input
                type="datetime-local"
                value={post.publish_at ? post.publish_at.slice(0, 16) : ''}
                onChange={(e) => update('publish_at', e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-white outline-none"
              />
            </div>
          )}
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Tags (comma separated)</div>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-white outline-none"
              placeholder="news, tutorial"
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Excerpt</div>
            <textarea
              value={post.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              placeholder="Auto-generated from first paragraph if blank"
              className="h-20 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white outline-none"
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Cover image</div>
            {post.cover_path && <img src={post.cover_path} alt="" className="mb-2 rounded-lg border border-zinc-800" />}
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 py-2.5 text-xs text-zinc-400 hover:border-emerald-600 hover:text-emerald-400">
              <Upload size={13} /> Upload cover
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadCover(e.target.files[0])} />
            </label>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">SEO title override</div>
            <input
              value={post.meta_title}
              onChange={(e) => update('meta_title', e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-white outline-none"
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">SEO description override</div>
            <textarea
              value={post.meta_description}
              onChange={(e) => update('meta_description', e.target.value)}
              className="h-16 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white outline-none"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
