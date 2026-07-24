import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadUserData, maybeRunDailyBackup } from '../utils/storage';
import { suggestNextAction } from '../utils/ideaOrganizer';
import { IconHelpBulb, IconPlus } from '../components/Icons';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

function countdownLabel(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'in corso';
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `tra ${minutes}m`;
  return `tra ${hours}h ${minutes}m`;
}

const PRIORITY_SCORE = { Urgente: 3, Lavoro: 2, Personale: 1, Altro: 0, 'Da nota': 1 };

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    maybeRunDailyBackup(user);
    setNotes(loadUserData(user, 'notes', []));
    setEvents(loadUserData(user, 'events', []));
    setCountdowns(loadUserData(user, 'countdowns', []));
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 3),
    [notes]
  );

  const pendingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => e.date && e.status !== 'completato' && new Date(e.date).getTime() >= now);
  }, [events]);

  const nextEvent = useMemo(
    () => [...pendingEvents].sort((a, b) => new Date(a.date) - new Date(b.date))[0],
    [pendingEvents]
  );

  const topUrgent = useMemo(() => {
    return [...pendingEvents]
      .sort((a, b) => {
        const scoreA = (PRIORITY_SCORE[a.category] || 0) - new Date(a.date).getTime() / 1e13;
        const scoreB = (PRIORITY_SCORE[b.category] || 0) - new Date(b.date).getTime() / 1e13;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [pendingEvents]);

  const featuredCountdown = useMemo(() => {
    const now = Date.now();
    const active = countdowns.filter((c) => c.active !== false && new Date(c.date).getTime() >= now);
    const important = active.find((c) => c.important);
    return important || [...active].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  }, [countdowns]);

  const suggestion = useMemo(() => suggestNextAction(events, notes), [events, notes]);

  const lastNote = recentNotes[0];
  const lastEvent = useMemo(() => {
    return [...events].filter((e) => e.updatedAt || e.date).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  }, [events]);

  return (
    <div className="px-5 pt-4 pb-6 max-w-2xl mx-auto page-transition overflow-x-hidden">
      <h1 className="text-2xl font-extrabold mb-1">{greeting()} {user}</h1>
      <p className="text-textSoft dark:text-dark-text/60 mb-6">La tua giornata</p>

      {nextEvent && (
        <section className="card p-5 mb-4 border-l-4" style={{ borderColor: nextEvent.color || '#C65A3A' }}>
          <p className="text-xs uppercase tracking-wide text-textSoft dark:text-dark-text/50 mb-1">Prossimo impegno</p>
          <p className="font-bold text-lg">{nextEvent.title}</p>
          <p className="text-sm text-textSoft dark:text-dark-text/60">
            {formatDate(nextEvent.date)} · <span className="font-semibold text-primary dark:text-dark-primary">{countdownLabel(nextEvent.date)}</span>
          </p>
        </section>
      )}

      <button
        onClick={() => navigate('/note', { state: { createNew: true } })}
        className="btn-primary w-full text-lg mb-3 shadow-soft min-h-[52px] flex items-center justify-center gap-2"
      >
        <IconPlus className="w-5 h-5" /> Nuova nota
      </button>

      <button
        onClick={() => navigate(suggestion ? (suggestion.type === 'event' ? '/calendario' : '/note') : '/note')}
        disabled={!suggestion}
        className="btn-ghost w-full mb-6 text-sm min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <IconHelpBulb className="w-4 h-4 shrink-0" />
        {suggestion ? (
          <span>Cosa devo fare adesso? <span className="font-semibold">{suggestion.title}</span> ({suggestion.hint})</span>
        ) : (
          <span>Cosa devo fare adesso? — Nessuna attività in programma</span>
        )}
      </button>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Le 3 attività più urgenti</h2>
        {topUrgent.length === 0 && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessuna attività urgente.</p>}
        <ul className="space-y-2">
          {topUrgent.map((e) => (
            <li key={e.id} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color || '#C65A3A' }} />
              <span className="font-medium flex-1 truncate">{e.title}</span>
              <span className="text-textSoft dark:text-dark-text/50 text-xs shrink-0">{countdownLabel(e.date)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Countdown in evidenza</h2>
        {!featuredCountdown && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessun countdown attivo.</p>}
        {featuredCountdown && (
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: featuredCountdown.color || '#C65A3A' }}
            >
              {(featuredCountdown.title || '?').charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-medium">{featuredCountdown.title}{featuredCountdown.important ? ' · importante' : ''}</p>
              <p className="text-sm font-semibold" style={{ color: featuredCountdown.color || '#C65A3A' }}>
                {countdownLabel(featuredCountdown.date)}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Note recenti</h2>
        {recentNotes.length === 0 && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessuna nota ancora.</p>}
        <ul className="space-y-2">
          {recentNotes.map((n) => (
            <li key={n.id} className="text-sm">
              <span className="font-medium">{n.title || 'Senza titolo'}</span>
              <span className="text-textSoft dark:text-dark-text/50"> — {formatDate(n.updatedAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      {(lastNote || lastEvent) && (
        <section className="card p-5">
          <h2 className="font-bold mb-3 text-sm text-textSoft dark:text-dark-text/60">Continua da dove eri rimasto</h2>
          <div className="space-y-2">
            {lastNote && (
              <button onClick={() => navigate('/note')} className="w-full text-left text-sm flex items-center justify-between">
                <span>Nota: <span className="font-medium">{lastNote.title || 'Senza titolo'}</span></span>
                <span className="text-xs text-textSoft dark:text-dark-text/40">{formatDate(lastNote.updatedAt)}</span>
              </button>
            )}
            {lastEvent && (
              <button onClick={() => navigate('/calendario')} className="w-full text-left text-sm flex items-center justify-between">
                <span>Attività: <span className="font-medium">{lastEvent.title}</span></span>
                <span className="text-xs text-textSoft dark:text-dark-text/40">{formatDate(lastEvent.date)}</span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
