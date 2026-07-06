import React, { useEffect, useState } from 'react';
import { Check, Copy, Upload, Loader2 } from 'lucide-react';
import { api } from './api.js';

export default function Media() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function reload() {
    setItems(await api.get('/api/uploads'));
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  async function handleUpload(files) {
    setUploading(true);
    try {
      for (const f of files) await api.upload(f);
      await reload();
    } finally {
      setUploading(false);
    }
  }

  function copy(item) {
    navigator.clipboard.writeText(location.origin + item.path);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Media</h1>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          Upload
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files.length && handleUpload([...e.target.files])} />
        </label>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-zinc-600" size={26} /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">No images uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <img src={item.path} alt="" className="aspect-square w-full object-cover" />
              <button
                onClick={() => copy(item)}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === item.id ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
