import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Settings as SettingsIcon, Image as ImageIcon, LogOut, ExternalLink, Loader2 } from 'lucide-react';
import { api } from './api.js';
import Login from './Login.jsx';
import Posts from './Posts.jsx';
import Editor from './Editor.jsx';
import Settings from './Settings.jsx';
import Media from './Media.jsx';

const NAV = [
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'media', label: 'Media', icon: ImageIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon }
];

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [view, setView] = useState({ page: 'posts' });

  useEffect(() => {
    api.get('/api/me').then((r) => setAuthed(r.authed)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-zinc-600" size={28} />
      </div>
    );
  }
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  if (view.page === 'editor') {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <Editor postId={view.postId} onBack={() => setView({ page: 'posts' })} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="flex w-56 flex-none flex-col border-r border-zinc-900 bg-zinc-950 p-4">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">I</div>
          <div>
            <div className="text-sm font-semibold text-white">Inkpress</div>
            <div className="text-[11px] text-zinc-500">Admin</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView({ page: key })}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                view.page === key ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 pt-6">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900/60 hover:text-zinc-200">
            <ExternalLink size={16} /> View blog
          </a>
          <button
            onClick={async () => {
              await api.post('/api/logout');
              setAuthed(false);
            }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-zinc-900/60 hover:text-zinc-200"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view.page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {view.page === 'posts' && (
              <Posts onEdit={(postId) => setView({ page: 'editor', postId })} onNew={() => setView({ page: 'editor', postId: null })} />
            )}
            {view.page === 'media' && <Media />}
            {view.page === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
