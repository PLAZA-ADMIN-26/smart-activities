import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserData, saveUserData, moveToTrash } from '../utils/storage';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconChevronLeft, IconChevronRight, IconPlus } from '../components/Icons';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CATEGORY_COLORS = {
  Lavoro: '#C65A3A',
  Personale: '#E07A4E',
  Urgente: '#A9472B',
  Altro: '#6B5647',
  'Da nota': '#6B5647'
};

const WEEKDAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']; // Lunedì → Domenica

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

// Indice del giorno con Lunedì = 0 ... Domenica = 6 (invece del getDay() nativo con Domenica = 0)
function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function startOfWeek(d) {
  const res = new Date(d);
  res.setDate(d.getDate() - mondayIndex(d));
  res.setHours(0, 0, 0, 0);
  return res;
}

function shortCountdown(dateISO) {
  if (!dateISO) return '';
  const diff = new Date(dateISO).getTime() - Date.now();
  if (diff <= 0) return 'scaduto';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `tra ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `tra ${hours}h`;
  const days = Math.round(hours / 24);
  return `tra ${days}g`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tutte');
  const [editing, setEditing] = useState(null);
  const [dayDetail, setDayDetail] = useState(null); // Date selezionata per il dettaglio giorno
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    setEvents(loadUserData(user, 'events', []));
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const toggleStatus = (event) => handleSaveEvent({ ...event, status: event.status === 'completato' ? 'da fare' : 'completato' });

  const rescheduleEventToDay = (eventId, newDay) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev || !ev.date) return;
    const old = new Date(ev.date);
    const updatedDate = new Date(newDay);
    updatedDate.setHours(old.getHours(), old.getMinutes(), 0, 0);
    handleSaveEvent({ ...ev, date: updatedDate.toISOString() });
  };

  const openNewEventOnDay = (day) => {
    const d = new Date(day);
    d.setHours(9, 0, 0, 0);
    setDayDetail(null);
    setEditing({ date: d.toISOString() });
  };

  return (
    <div className="px-5 pt-4 pb-6 max-w-2xl mx-auto page-transition overflow-x-hidden">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-extrabold">Calendario</h1>
        <button onClick={() => setEditing({})} className="btn-primary px-4 py-2 text-sm min-h-[44px] shrink-0">+ Evento</button>
      </div>

      <div className="flex gap-2 mb-3 text-sm">
        {['month', 'week', 'agenda'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-full min-h-[44px] ${view === v ? 'bg-primary text-white' : 'btn-ghost'}`}
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

      <select className="input-field mb-4" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
        <option>Tutte</option>
        {['Lavoro', 'Personale', 'Urgente', 'Altro'].map((c) => <option key={c}>{c}</option>)}
      </select>

      {view === 'month' && (
        <MonthView cursor={cursor} setCursor={setCursor} eventsByDay={eventsByDay} onDropOnDay={rescheduleEventToDay} onSelectDay={setDayDetail} />
      )}
      {view === 'week' && (
        <WeekView cursor={cursor} setCursor={setCursor} eventsByDay={eventsByDay} onDropOnDay={rescheduleEventToDay} onSelectDay={setDayDetail} />
      )}
      {view === 'agenda' && (
        <AgendaView events={filteredEvents} onSelectEvent={setEditing} onToggleStatus={toggleStatus} />
      )}

      {dayDetail && (
        <DayDetailModal
          day={dayDetail}
          events={eventsByDay[dayDetail.toDateString()] || []}
          onClose={() => setDayDetail(null)}
          onSelectEvent={(ev) => { setDayDetail(null); setEditing(ev); }}
          onToggleStatus={toggleStatus}
          onAddEvent={() => openNewEventOnDay(dayDetail)}
        />
      )}

      {editing && (
        <EventModal event={editing} onSave={handleSaveEvent} onDelete={(id) => setConfirmDeleteId(id)} onClose={() => setEditing(null)} />
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

function MonthView({ cursor, setCursor, eventsByDay, onDropOnDay, onSelectDay }) {
  const first = startOfMonth(cursor);
  const totalDays = daysInMonth(cursor);
  const leadingBlanks = mondayIndex(first);
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold capitalize">{cursor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
          <IconChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-xs text-center text-textSoft dark:text-dark-text/50 mb-1.5 font-medium">
        {WEEKDAY_LABELS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay[day.toDateString()] || [] : [];
          const isToday = day && day.toDateString() === today.toDateString();
          return (
            <button
              key={i}
              type="button"
              disabled={!day}
              onClick={() => day && onSelectDay(day)}
              className={`relative aspect-square rounded-2xl min-w-0 transition-colors duration-150 ${
                day ? 'bg-card dark:bg-dark-card active:bg-primary/10 dark:active:bg-dark-primary/15' : ''
              }`}
              onDragOver={(e) => day && e.preventDefault()}
              onDrop={(e) => {
                if (!day) return;
                const eventId = e.dataTransfer.getData('text/event-id');
                if (eventId) onDropOnDay(eventId, day);
              }}
            >
              {day && (
                <>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`text-base font-bold leading-none flex items-center justify-center w-7 h-7 rounded-full ${
                        isToday ? 'bg-primary dark:bg-dark-primary text-white' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </span>
                  <div className="absolute bottom-1.5 left-0 right-0 flex gap-0.5 items-center justify-center h-1.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData('text/event-id', e.id)}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: e.color || '#C65A3A' }}
                      />
                    ))}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-textSoft dark:text-dark-text/40 mt-2 text-center">
        Tocca un giorno per vedere o aggiungere le attività. Su desktop puoi trascinare un pallino su un altro giorno per spostare l'evento.
      </p>
    </div>
  );
}

function WeekView({ cursor, setCursor, eventsByDay, onDropOnDay, onSelectDay }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7))} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold">Settimana del {start.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7))} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
          <IconChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-2">
        {days.map((day) => {
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div
              key={day.toDateString()}
              className="card p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const eventId = e.dataTransfer.getData('text/event-id');
                if (eventId) onDropOnDay(eventId, day);
              }}
            >
              <button onClick={() => onSelectDay(day)} className="w-full text-left flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold capitalize ${isToday ? 'text-primary dark:text-dark-primary' : ''}`}>
                  {day.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'short' })}
                </span>
              </button>
              {(eventsByDay[day.toDateString()] || []).map((e) => (
                <div
                  key={e.id}
                  draggable
                  onDragStart={(ev) => ev.dataTransfer.setData('text/event-id', e.id)}
                  onClick={() => onSelectDay(day)}
                  className="flex items-center gap-2 text-sm py-1.5 w-full text-left min-h-[44px] cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-xs text-textSoft dark:text-dark-text/40 shrink-0">{shortCountdown(e.date)}</span>
                </div>
              ))}
              {!(eventsByDay[day.toDateString()] || []).length && (
                <p className="text-xs text-textSoft dark:text-dark-text/40">Nessun evento</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-textSoft dark:text-dark-text/40 mt-2 text-center">
        Tocca un giorno per vedere o aggiungere le attività.
      </p>
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
          <input type="checkbox" checked={e.status === 'completato'} onChange={() => onToggleStatus(e)} className="mt-1 accent-primary w-5 h-5 shrink-0" />
          <button onClick={() => onSelectEvent(e)} className="flex-1 text-left min-w-0">
            <p className={`font-semibold truncate ${e.status === 'completato' ? 'line-through text-textSoft dark:text-dark-text/40' : ''}`}>{e.title}</p>
            <p className="text-xs text-textSoft dark:text-dark-text/50">
              {e.date ? new Date(e.date).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Senza data'}
              {e.category ? ` · ${e.category}` : ''}
              {e.date ? ` · ${shortCountdown(e.date)}` : ''}
            </p>
          </button>
          <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: e.color }} />
        </div>
      ))}
    </div>
  );
}

function DayDetailModal({ day, events, onClose, onSelectEvent, onToggleStatus, onAddEvent }) {
  const sorted = [...events].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
      <div className="card w-full max-w-sm p-5 max-h-[75vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold capitalize">
            {day.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h3>
          <button onClick={onClose} className="text-sm text-textSoft dark:text-dark-text/50 min-h-[44px] px-2">Chiudi</button>
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-textSoft dark:text-dark-text/60 mb-4">Nessuna attività in questo giorno.</p>
            <button onClick={onAddEvent} className="btn-primary w-full min-h-[48px] flex items-center justify-center gap-2">
              <IconPlus className="w-4 h-4" /> Aggiungi evento
            </button>
          </div>
        )}

        {sorted.length > 0 && (
          <>
            <ul className="space-y-2 mb-4">
              {sorted.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={e.status === 'completato'}
                    onChange={() => onToggleStatus(e)}
                    className="mt-1 accent-primary w-5 h-5 shrink-0"
                  />
                  <button onClick={() => onSelectEvent(e)} className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-medium truncate ${e.status === 'completato' ? 'line-through text-textSoft dark:text-dark-text/40' : ''}`}>
                      {e.title}
                    </p>
                    <p className="text-xs text-textSoft dark:text-dark-text/50">
                      {new Date(e.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      {e.category ? ` · ${e.category}` : ''}
                    </p>
                  </button>
                  <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: e.color }} />
                </li>
              ))}
            </ul>
            <button onClick={onAddEvent} className="btn-ghost w-full min-h-[48px] flex items-center justify-center gap-2">
              <IconPlus className="w-4 h-4" /> Aggiungi un altro evento
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EventModal({ event, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event.title || '');
  const [date, setDate] = useState(event.date ? new Date(event.date).toISOString().slice(0, 16) : '');
  const [description, setDescription] = useState(event.description || '');
  const [category, setCategory] = useState(event.category && CATEGORY_COLORS[event.category] ? event.category : 'Personale');
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
      <div className="card w-full max-w-sm p-5 space-y-3">
        <h3 className="text-lg font-bold">{event.id ? 'Modifica evento' : 'Nuovo evento'}</h3>
        <input className="input-field" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-field" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <textarea className="input-field" placeholder="Descrizione" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {['Lavoro', 'Personale', 'Urgente', 'Altro'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="da fare">Da fare</option>
          <option value="completato">Completato</option>
        </select>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1 min-h-[44px]">Annulla</button>
          <button onClick={save} className="btn-primary flex-1 min-h-[44px]">Salva</button>
        </div>
        {event.id && (
          <button onClick={() => onDelete(event.id)} className="text-sm text-primary dark:text-dark-primary w-full text-center pt-1 min-h-[44px]">
            Elimina evento
          </button>
        )}
      </div>
    </div>
  );
}
