import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserData, saveUserData, moveToTrash } from '../utils/storage';
import ConfirmDialog from '../components/ConfirmDialog';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CATEGORY_COLORS = {
  Lavoro: '#C65A3A',
  Personale: '#E07A4E',
  'Da nota': '#A9472B',
  Altro: '#6B5647'
};

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function startOfWeek(d) {
  const day = d.getDay();
  const res = new Date(d);
  res.setDate(d.getDate() - day);
  res.setHours(0, 0, 0, 0);
  return res;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month'); // month | week | agenda
  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tutte');
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setEvents(loadUserData(user, 'events', []));
  }, [user]);

  const persist = (updated) => {
    setEvents(updated);
    saveUserData(user, 'events', updated);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch = (e.title || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'Tutte' || e.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [events, search, categoryFilter]);

  const eventsByDay = useMemo(() => {
    const map = {};
    filteredEvents.forEach((e) => {
      if (!e.date) return;
      const key = new Date(e.date).toDateString();
      map[key] = map[key] || [];
      map[key].push(e);
    });
    return map;
  }, [filteredEvents]);

  const handleSaveEvent = (event) => {
    const exists = events.some((e) => e.id === event.id);
    const updated = exists ? events.map((e) => (e.id === event.id ? event : e)) : [{ ...event, id: uid() }, ...events];
    persist(updated);
    setEditing(null);
  };

  const confirmDelete = () => {
    const ev = events.find((e) => e.id === confirmDeleteId);
    if (ev) moveToTrash(user, 'event', ev);
    persist(events.filter((e) => e.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    setEditing(null);
  };

  const toggleStatus = (event) => {
    handleSaveEvent({ ...event, status: event.status === 'completato' ? 'da fare' : 'completato' });
  };

  return (
    <div className="px-5 pt-8 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold">Calendario</h1>
        <button onClick={() => setEditing({})} className="btn-primary px-4 py-2 text-sm">+ Evento</button>
      </div>

      <div className="flex gap-2 mb-3 text-sm">
        {['month', 'week', 'agenda'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-xl2 ${view === v ? 'bg-primary text-white' : 'btn-ghost'}`}
          >
            {v === 'month' ? 'Mese' : v === 'week' ? 'Settimana' : 'Agenda'}
          </button>
        ))}
      </div>

      <input
        className="input-field mb-3"
        placeholder="Cerca eventi..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        className="input-field mb-4"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
      >
        <option>Tutte</option>
        {Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}
      </select>

      {view === 'month' && (
        <MonthView cursor={cursor} setCursor={setCursor} eventsByDay={eventsByDay} onSelectEvent={setEditing} />
      )}
      {view === 'week' && (
        <WeekView cursor={cursor} setCursor={setCursor} eventsByDay={eventsByDay} onSelectEvent={setEditing} />
      )}
      {view === 'agenda' && (
        <AgendaView events={filteredEvents} onSelectEvent={setEditing} onToggleStatus={toggleStatus} />
      )}

      {editing && (
        <EventModal
          event={editing}
          onSave={handleSaveEvent}
          onDelete={(id) => setConfirmDeleteId(id)}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Eliminare l'evento?"
        message="Questa operazione è irreversibile. Vuoi continuare?"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function MonthView({ cursor, setCursor, eventsByDay, onSelectEvent }) {
  const first = startOfMonth(cursor);
  const totalDays = daysInMonth(cursor);
  const startWeekday = first.getDay();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="px-2">‹</button>
        <p className="font-semibold capitalize">{cursor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="px-2">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-center text-textSoft dark:text-dark-text/50 mb-1">
        {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay[day.toDateString()] || [] : [];
          return (
            <div key={i} className={`aspect-square rounded-xl2 p-1 ${day ? 'bg-card dark:bg-dark-card' : ''}`}>
              {day && (
                <>
                  <p className="text-xs font-medium">{day.getDate()}</p>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onSelectEvent(e)}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: e.color || '#C65A3A' }}
                        title={e.title}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, setCursor, eventsByDay, onSelectEvent }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))} className="px-2">‹</button>
        <p className="font-semibold">Settimana del {start.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))} className="px-2">›</button>
      </div>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day.toDateString()} className="card p-3">
            <p className="text-sm font-semibold capitalize mb-1">
              {day.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
            {(eventsByDay[day.toDateString()] || []).map((e) => (
              <button key={e.id} onClick={() => onSelectEvent(e)} className="flex items-center gap-2 text-sm py-0.5 w-full text-left">
                <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                {e.title}
              </button>
            ))}
            {!(eventsByDay[day.toDateString()] || []).length && (
              <p className="text-xs text-textSoft dark:text-dark-text/40">Nessun evento</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaView({ events, onSelectEvent, onToggleStatus }) {
  const sorted = [...events].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  return (
    <div className="space-y-2">
      {sorted.length === 0 && <p className="text-sm text-textSoft dark:text-dark-text/60 text-center py-10">Nessun evento.</p>}
      {sorted.map((e) => (
        <div key={e.id} className="card p-4 flex items-start gap-3">
          <input type="checkbox" checked={e.status === 'completato'} onChange={() => onToggleStatus(e)} className="mt-1 accent-primary w-4 h-4" />
          <button onClick={() => onSelectEvent(e)} className="flex-1 text-left">
            <p className={`font-semibold ${e.status === 'completato' ? 'line-through text-textSoft dark:text-dark-text/40' : ''}`}>{e.title}</p>
            <p className="text-xs text-textSoft dark:text-dark-text/50">
              {e.date ? new Date(e.date).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Senza data'}
              {e.category ? ` · ${e.category}` : ''}
            </p>
          </button>
          <span className="w-2 h-2 rounded-full mt-2" style={{ background: e.color }} />
        </div>
      ))}
    </div>
  );
}

function EventModal({ event, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event.title || '');
  const [date, setDate] = useState(event.date ? new Date(event.date).toISOString().slice(0, 16) : '');
  const [description, setDescription] = useState(event.description || '');
  const [category, setCategory] = useState(event.category || 'Personale');
  const [status, setStatus] = useState(event.status || 'da fare');

  const save = () => {
    onSave({
      ...event,
      title: title || 'Senza titolo',
      date: date ? new Date(date).toISOString() : null,
      description,
      category,
      color: CATEGORY_COLORS[category] || '#C65A3A',
      status
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-sm p-5 space-y-3">
        <h3 className="text-lg font-bold">{event.id ? 'Modifica evento' : 'Nuovo evento'}</h3>
        <input className="input-field" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-field" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <textarea className="input-field" placeholder="Descrizione" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="da fare">Da fare</option>
          <option value="completato">Completato</option>
        </select>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Annulla</button>
          <button onClick={save} className="btn-primary flex-1">Salva</button>
        </div>
        {event.id && (
          <button onClick={() => onDelete(event.id)} className="text-sm text-primary dark:text-dark-primary w-full text-center pt-1">
            Elimina evento
          </button>
        )}
      </div>
    </div>
  );
}
