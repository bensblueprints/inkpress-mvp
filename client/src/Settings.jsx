import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from './api.js';

const THEMES = [
  { key: 'paper', label: 'Paper', desc: 'Light, serif, classic', swatch: '#fbf9f4', text: '#2a2620' },
  { key: 'carbon', label: 'Carbon', desc: 'Dark, mono accents', swatch: '#0b0d10', text: '#5fd0a3' },
  { key: 'editorial', label: 'Editorial', desc: 'Magazine, large covers', swatch: '#ffffff', text: '#17181a' }
];

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get('/api/settings').then(setS); }, []);

  function update(k, v) { setS((cur) => ({ ...cur, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.put('/api/settings', s);
      setS(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  function updateNav(i, field, value) {
    const nav = [...(s.nav || [])];
    nav[i] = { ...nav[i], [field]: value };
    update('nav', nav);
  }
  function addNav() { update('nav', [...(s.nav || []), { label: '', url: '' }]); }
  function removeNav(i) { update('nav', (s.nav || []).filter((_, idx) => idx !== i)); }

  if (!s) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-zinc-600" size={26} /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold text-white">Settings</h1>

      {!s.base_url && (
        <div className="mb-5 rounded-lg border border-amber-800 bg-amber-950/50 px-4 py-3 text-sm text-amber-300">
          Base URL is not set — RSS, sitemap, and social preview links will use whatever host serves the request.
          Set it before going live.
        </div>
      )}

      <div className="flex flex-col gap-5">
        <Field label="Site title"><input className="input" value={s.site_title} onChange={(e) => update('site_title', e.target.value)} /></Field>
        <Field label="Description"><input className="input" value={s.description} onChange={(e) => update('description', e.target.value)} /></Field>
        <Field label="Author"><input className="input" value={s.author} onChange={(e) => update('author', e.target.value)} /></Field>
        <Field label="Base URL"><input className="input" placeholder="https://blog.example.com" value={s.base_url} onChange={(e) => update('base_url', e.target.value)} /></Field>
        <Field label="Footer text"><input className="input" value={s.footer} onChange={(e) => update('footer', e.target.value)} /></Field>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Theme</div>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => update('theme', t.key)}
                className={`rounded-lg border p-3 text-left transition ${s.theme === t.key ? 'border-emerald-500' : 'border-zinc-800 hover:border-zinc-600'}`}
              >
                <div className="mb-2 h-14 rounded" style={{ background: t.swatch, border: '1px solid #333' }}>
                  <div className="p-2 text-xs font-semibold" style={{ color: t.text }}>Aa</div>
                </div>
                <div className="text-sm font-medium text-white">{t.label}</div>
                <div className="text-xs text-zinc-500">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-white">Zero-JS public pages</div>
            <div className="text-xs text-zinc-500">Ship no JavaScript at all on public pages. Turn off to enable a tiny copy-code button.</div>
          </div>
          <button
            onClick={() => update('zero_js', !s.zero_js)}
            className={`h-6 w-11 flex-none rounded-full transition ${s.zero_js ? 'bg-emerald-600' : 'bg-zinc-700'}`}
          >
            <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition ${s.zero_js ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Nav links</div>
            <button onClick={addNav} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><Plus size={13} /> Add</button>
          </div>
          <div className="flex flex-col gap-2">
            {(s.nav || []).map((l, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" placeholder="Label" value={l.label} onChange={(e) => updateNav(i, 'label', e.target.value)} />
                <input className="input" placeholder="/url" value={l.url} onChange={(e) => updateNav(i, 'url', e.target.value)} />
                <button onClick={() => removeNav(i)} className="text-zinc-600 hover:text-red-400"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saved ? 'Saved!' : 'Save settings'}
        </button>
      </div>
      <style>{`.input { width: 100%; background: #18181b; border: 1px solid #27272a; border-radius: 0.5rem; padding: 0.5rem 0.65rem; font-size: 0.875rem; color: white; outline: none; } .input:focus { border-color: #059669; }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      {children}
    </div>
  );
}
