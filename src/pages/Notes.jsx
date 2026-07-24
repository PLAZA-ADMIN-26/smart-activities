import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadUserData, saveUserData, moveToTrash } from '../utils/storage';
import NoteEditor from './NoteEditor';
import ConfirmDialog from '../components/ConfirmDialog';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const PRIORITY_COLOR = { alta: '#C65A3A', media: '#E07A4E', bassa: '#6B5647' };

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
    if (location.state?.createNew) setActiveNote({});
  }, [location.state]);

  const persistNotes = (updated) => {
    setNotes(updated);
    saveUserData(user, 'notes', updated);
  };

  const persistEvents = (updated) => {
    setEvents(updated);
    saveUserData(user, 'events', updated);
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

  const CATEGORY_COLORS = { Lavoro: '#C65A3A', Personale: '#E07A4E', Urgente: '#A9472B', Altro: '#6B5647' };

  const createEventFromTask = (t) => ({
    id: uid(),
    title: t.title.length > 60 ? t.title.slice(0, 60) + '…' : t.title,
    date: t.date,
    description: t.title,
    color: CATEGORY_COLORS[t.category] || PRIORITY_COLOR[t.priority] || '#C65A3A',
    category: t.category || (t.priority === 'alta' ? 'Urgente' : 'Personale'),
    status: 'da fare'
  });

  const addCountdownForEvent = (ev) => {
    const countdowns = loadUserData(user, 'countdowns', []);
    saveUserData(user, 'countdowns', [
      { id: uid(), title: ev.title, date: ev.date, color: ev.color, icon: '⏳', auto: true },
      ...countdowns
    ]);
  };

  // Impegni con data certa: creati automaticamente
  const handleAddAutoTasks = (tasks) => {
    const newEvents = tasks.filter((t) => t.date).map(createEventFromTask);
    persistEvents([...newEvents, ...events]);
    newEvents.forEach(addCountdownForEvent);
  };

  // Impegni con data incerta: creati solo dopo conferma dell'utente
  const handleAddSuggestedTask = (task) => {
    const ev = createEventFromTask(task);
    persistEvents([ev, ...events]);
    addCountdownForEvent(ev);
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
          onAddAutoTasks={handleAddAutoTasks}
          onAddSuggestedTask={handleAddSuggestedTask}
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
    <div className="px-5 pt-4 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold">Note</h1>
        <button onClick={() => setActiveNote({})} className="btn-primary px-4 py-2 text-sm min-h-[44px]">+ Nuova</button>
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
          className={`px-3 py-1.5 rounded-xl2 min-h-[44px] ${sortBy === 'recent' ? 'bg-primary text-white' : 'btn-ghost'}`}
        >Più recenti</button>
        <button
          onClick={() => setSortBy('oldest')}
          className={`px-3 py-1.5 rounded-xl2 min-h-[44px] ${sortBy === 'oldest' ? 'bg-primary text-white' : 'btn-ghost'}`}
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
              {n.lastEditedBy ? ` · ${n.lastEditedBy}` : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
