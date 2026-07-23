import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadUserData, maybeRunDailyBackup } from '../utils/storage';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [countdowns, setCountdowns] = useState([]);

  useEffect(() => {
    if (!user) return;
    maybeRunDailyBackup(user);
    setNotes(loadUserData(user, 'notes', []));
    setEvents(loadUserData(user, 'events', []));
    setCountdowns(loadUserData(user, 'countdowns', []));
  }, [user]);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 3),
    [notes]
  );

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => e.date && new Date(e.date).getTime() >= now && e.status !== 'completato')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [events]);

  const closestCountdown = useMemo(() => {
    const now = Date.now();
    return [...countdowns]
      .filter((c) => new Date(c.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  }, [countdowns]);

  return (
    <div className="px-5 pt-8 pb-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1">Ciao {user} 👋</h1>
      <p className="text-textSoft dark:text-dark-text/60 mb-6">Ecco il riepilogo di oggi.</p>

      <button
        onClick={() => navigate('/note', { state: { createNew: true } })}
        className="btn-primary w-full text-lg mb-6 shadow-soft"
      >
        + Nuova nota
      </button>

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

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Prossimi impegni</h2>
        {upcomingEvents.length === 0 && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessun impegno in programma.</p>}
        <ul className="space-y-2">
          {upcomingEvents.map((e) => (
            <li key={e.id} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: e.color || '#C65A3A' }} />
              <span className="font-medium">{e.title}</span>
              <span className="text-textSoft dark:text-dark-text/50">— {formatDate(e.date)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-bold mb-3">Countdown in scadenza</h2>
        {!closestCountdown && <p className="text-sm text-textSoft dark:text-dark-text/60">Nessun countdown attivo.</p>}
        {closestCountdown && (
          <div>
            <p className="font-medium">{closestCountdown.title}</p>
            <p className="text-sm text-textSoft dark:text-dark-text/60">{formatDate(closestCountdown.date)}</p>
          </div>
        )}
      </section>
    </div>
  );
}
