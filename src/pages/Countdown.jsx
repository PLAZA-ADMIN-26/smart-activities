import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserData, saveUserData, moveToTrash } from '../utils/storage';
import ConfirmDialog from '../components/ConfirmDialog';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const ICONS = ['⏳', '🎯', '🎉', '✈️', '📌', '💼', '🎂', '📝'];
const COLORS = ['#C65A3A', '#E07A4E', '#A9472B', '#6B5647'];

function getRemaining(targetISO) {
  const diff = new Date(targetISO).getTime() - Date.now();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { expired: false, days, hours, minutes, seconds };
}

export default function Countdown() {
  const { user } = useAuth();
  const [countdowns, setCountdowns] = useState([]);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    setCountdowns(loadUserData(user, 'countdowns', []));
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const persist = (updated) => {
    setCountdowns(updated);
    saveUserData(user, 'countdowns', updated);
  };

  const addCountdown = (c) => {
    persist([{ ...c, id: uid() }, ...countdowns]);
    setCreating(false);
  };

  const confirmDelete = () => {
    const c = countdowns.find((x) => x.id === confirmDeleteId);
    if (c) moveToTrash(user, 'countdown', c);
    persist(countdowns.filter((x) => x.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  return (
    <div className="px-5 pt-8 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold">Countdown</h1>
        <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm">+ Nuovo</button>
      </div>

      <div className="space-y-3">
        {countdowns.length === 0 && (
          <p className="text-sm text-textSoft dark:text-dark-text/60 text-center py-10">Nessun countdown attivo.</p>
        )}
        {countdowns.map((c) => {
          const r = getRemaining(c.date);
          const urgent = !r.expired && r.days === 0 && r.hours < 24;
          const soon = !r.expired && r.days < 7;
          const borderColor = urgent ? '#C65A3A' : soon ? '#E07A4E' : 'transparent';
          return (
            <div key={c.id} className="card p-4" style={{ borderLeft: `4px solid ${borderColor}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold flex items-center gap-2">
                  <span>{c.icon || '⏳'}</span> {c.title}
                </p>
                <button onClick={() => setConfirmDeleteId(c.id)} className="text-textSoft dark:text-dark-text/40 text-sm">✕</button>
              </div>
              {r.expired ? (
                <p className="text-sm font-medium text-textSoft dark:text-dark-text/60">Scaduto</p>
              ) : (
                <div className="flex gap-3 text-center">
                  {[['gg', r.days], ['hh', r.hours], ['mm', r.minutes], ['ss', r.seconds]].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xl font-extrabold" style={{ color: c.color || '#C65A3A' }}>{String(val).padStart(2, '0')}</p>
                      <p className="text-[10px] text-textSoft dark:text-dark-text/50 uppercase">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-textSoft dark:text-dark-text/40 mt-2">
                {new Date(c.date).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
      </div>

      {creating && <CreateCountdownModal onSave={addCountdown} onClose={() => setCreating(false)} />}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Eliminare il countdown?"
        message="Questa operazione è irreversibile. Vuoi continuare?"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CreateCountdownModal({ onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);

  const save = () => {
    if (!title || !date) return;
    onSave({ title, date: new Date(date).toISOString(), icon, color });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-sm p-5 space-y-3">
        <h3 className="text-lg font-bold">Nuovo countdown</h3>
        <input className="input-field" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-field" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <p className="text-sm text-textSoft dark:text-dark-text/60 mb-1.5">Icona</p>
          <div className="flex gap-2 flex-wrap">
            {ICONS.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={`text-xl w-9 h-9 rounded-xl2 flex items-center justify-center ${icon === i ? 'bg-primary/20 ring-2 ring-primary' : 'bg-bg dark:bg-dark-bg'}`}
              >{i}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-textSoft dark:text-dark-text/60 mb-1.5">Colore</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full"
                style={{ background: c, outline: color === c ? '2px solid #2F241D' : 'none' }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Annulla</button>
          <button onClick={save} className="btn-primary flex-1">Crea</button>
        </div>
      </div>
    </div>
  );
}
