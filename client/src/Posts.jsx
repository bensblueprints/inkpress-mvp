import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Trash2, ExternalLink } from 'lucide-react';
import { api } from './api.js';

const CHIPS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' }
];

export default function Posts({ onEdit, onNew }) {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      setPosts(await api.get(`/api/posts?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => { reload(); }, [reload]);

  async function remove(id) {
    if (!confirm('Delete this post?')) return;
    await api.del(`/api/posts/${id}`);
    reload();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Posts</h1>
        <button
          onClick={() => onNew()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus size={15} /> New post
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setStatus(c.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === c.key ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-3 text-sm text-white outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        {posts.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">{loading ? 'Loading…' : 'No posts yet.'}</div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-zinc-900 bg-zinc-950 px-4 py-3 last:border-b-0 hover:bg-zinc-900/50">
            <button onClick={() => onEdit(p.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-white">{p.title}</div>
              <div className="mt-0.5 truncate text-xs text-zinc-500">/{p.slug}</div>
            </button>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                p.status === 'published'
                  ? 'bg-emerald-900/60 text-emerald-300'
                  : p.status === 'scheduled'
                  ? 'bg-amber-900/60 text-amber-300'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {p.status}
            </span>
            {p.status === 'published' && (
              <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-200">
                <ExternalLink size={15} />
              </a>
            )}
            <button onClick={() => remove(p.id)} className="text-zinc-600 hover:text-red-400">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
