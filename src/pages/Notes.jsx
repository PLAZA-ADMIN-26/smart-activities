import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadUserData, saveUserData, moveToTrash } from '../utils/storage';
import NoteEditor from './NoteEditor';
import ConfirmDialog from '../components/ConfirmDialog';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function Notes() {
  const { user } = useAuth();
  const location = useLocation();
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [activeNote, setActiveNote] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setNotes(loadUserData(user, 'notes', []));
    setEvents(loadUserData(user, 'events', []));
  }, [user]);

  useEffect(() => {
    if (location.state?.createNew) {
      setActiveNote({});
    }
  }, [location.state]);

  const persistNotes = (updated) => {
    setNotes(updated);
    saveUserData(user, 'notes', updated);
  };

  const handleSaveNote = (note) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      const updated = exists ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev];
      saveUserData(user, 'notes', updated);
      return updated;
    });
    setActiveNote(note);
  };

  const requestDelete = () => setConfirmDeleteId(activeNote?.id || 'draft');

  const confirmDelete = () => {
    if (activeNote?.id) {
      const noteToTrash = notes.find((n) => n.id === activeNote.id);
      if (noteToTrash) moveToTrash(user, 'note', noteToTrash);
      persistNotes(notes.filter((n) => n.id !== activeNote.id));
    }
    setConfirmDeleteId(null);
    setActiveNote(null);
  };

  const handleAddTasksToCalendar = (tasks) => {
    const newEvents = tasks.map((t) => ({
      id: uid(),
      title: t.title.length > 60 ? t.title.slice(0, 60) + '…' : t.title,
      date: t.date,
      description: t.title,
      color: t.priority ? '#C65A3A' : '#E07A4E',
      category: 'Da nota',
      status: 'da fare'
    }));
    const updatedEvents = [...newEvents, ...events];
    setEvents(updatedEvents);
    saveUserData(user, 'events', updatedEvents);

    // Crea anche countdown per gli eventi con data
    const countdowns = loadUserData(user, 'countdowns', []);
    const newCountdowns = newEvents
      .filter((e) => e.date)
      .map((e) => ({ id: uid(), title: e.title, date: e.date, color: e.color, icon: '⏳', auto: true }));
    saveUserData(user, 'countdowns', [...newCountdowns, ...countdowns]);
  };

  const filteredNotes = useMemo(() => {
    let list = notes.filter((n) =>
      (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) =>
      sortBy === 'recent' ? (b.updatedAt || 0) - (a.updatedAt || 0) : (a.updatedAt || 0) - (b.updatedAt || 0)
    );
    return list;
  }, [notes, search, sortBy]);

  if (activeNote) {
    return (
      <>
        <NoteEditor
          note={activeNote.id ? activeNote : null}
          onSave={handleSaveNote}
          onDelete={requestDelete}
          onClose={() => setActiveNote(null)}
          onAddTasksToCalendar={handleAddTasksToCalendar}
        />
        <ConfirmDialog
          open={!!confirmDeleteId}
          title="Eliminare la nota?"
          message="Questa operazione è irreversibile. Vuoi continuare?"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={confirmDelete}
        />
      </>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold">Note</h1>
        <button onClick={() => setActiveNote({})} className="btn-primary px-4 py-2 text-sm">+ Nuova</button>
      </div>

      <input
        className="input-field mb-3"
        placeholder="Cerca nelle note..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2 mb-4 text-sm">
        <button
          onClick={() => setSortBy('recent')}
          className={`px-3 py-1.5 rounded-xl2 ${sortBy === 'recent' ? 'bg-primary text-white' : 'btn-ghost'}`}
        >Più recenti</button>
        <button
          onClick={() => setSortBy('oldest')}
          className={`px-3 py-1.5 rounded-xl2 ${sortBy === 'oldest' ? 'bg-primary text-white' : 'btn-ghost'}`}
        >Più vecchie</button>
      </div>

      <div className="space-y-3">
        {filteredNotes.length === 0 && (
          <p className="text-sm text-textSoft dark:text-dark-text/60 text-center py-10">Nessuna nota trovata.</p>
        )}
        {filteredNotes.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveNote(n)}
            className="card p-4 w-full text-left block"
          >
            <p className="font-semibold truncate">{n.title || 'Senza titolo'}</p>
            <p className="text-sm text-textSoft dark:text-dark-text/60 truncate">{n.content || '—'}</p>
            <p className="text-xs text-textSoft dark:text-dark-text/40 mt-1">
              {new Date(n.updatedAt || n.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
