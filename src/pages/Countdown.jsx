import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModalState } from '../context/ModalStateContext';
import { loadUserData, saveUserData, moveToTrash } from '../utils/storage';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconStar, IconClose } from '../components/Icons';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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

function MiniToggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`shrink-0 w-9 h-5 rounded-full flex items-center px-0.5 overflow-hidden transition-colors duration-200 disabled:opacity-40 ${
        checked ? 'bg-primary dark:bg-dark-primary justify-end' : 'bg-textSoft/25 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow transition-all duration-200" />
    </button>
  );
}

export default function Countdown() {
  const { user } = useAuth();
  const [countdowns, setCountdowns] = useState([]);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const { setModalOpen } = useModalState();

  useEffect(() => {
    setModalOpen(!!(creating || confirmDeleteId));
    return () => setModalOpen(false);
  }, [creating, confirmDeleteId, setModalOpen]);
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
    persist([{ ...c, id: uid(), active: true }, ...countdowns]);
    setCreating(false);
  };

  const confirmDelete = () => {
    const c = countdowns.find((x) => x.id === confirmDeleteId);
    if (c) moveToTrash(user, 'countdown', c);
    persist(countdowns.filter((x) => x.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  const toggleImportant = (id) => {
    persist(countdowns.map((c) => (c.id === id ? { ...c, important: !c.important } : c)));
  };

  const toggleActive = (id) => {
    persist(countdowns.map((c) => (c.id === id ? { ...c, active: c.active === false ? true : false } : c)));
  };

  const sorted = [...countdowns].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="px-5 pt-4 pb-6 max-w-2xl mx-auto page-transition overflow-x-hidden">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-extrabold">Countdown</h1>
        <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm min-h-[44px] shrink-0">+ Nuovo</button>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 && (
          <p className="text-sm text-textSoft dark:text-dark-text/60 text-center py-10">Nessun countdown attivo.</p>
        )}
        {sorted.map((c) => {
          const isActive = c.active !== false;
          const r = getRemaining(c.date);
          const urgent = isActive && !r.expired && r.days === 0 && r.hours < 24;
          const soon = isActive && !r.expired && r.days < 7;
          const borderColor = urgent ? '#C65A3A' : soon ? '#E07A4E' : 'transparent';

          return (
            <div key={c.id} className={`card p-4 ${!isActive ? 'opacity-50' : ''}`} style={{ borderLeft: `4px solid ${borderColor}` }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: c.color || '#C65A3A' }}
                  >
                    {(c.title || '?').charAt(0).toUpperCase()}
                  </span>
                  <p className="font-semibold truncate min-w-0">{c.title}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => toggleImportant(c.id)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-primary dark:text-dark-primary"
                    title="Segna come importante (mostrato in homepage)"
                  >
                    <IconStar className="w-5 h-5" filled={c.important} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-textSoft dark:text-dark-text/40"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                  {!isActive ? (
                    <p className="text-sm font-medium text-textSoft dark:text-dark-text/50">Countdown disattivato</p>
                  ) : r.expired ? (
                    <p className="text-sm font-medium text-textSoft dark:text-dark-text/60">Scaduto</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-center max-w-[220px]">
                      {[['gg', r.days], ['hh', r.hours], ['mm', r.minutes], ['ss', r.seconds]].map(([label, val]) => (
                        <div key={label}>
                          <p className="text-lg sm:text-xl font-extrabold tabular-nums" style={{ color: c.color || '#C65A3A' }}>
                            {String(val).padStart(2, '0')}
                          </p>
                          <p className="text-[10px] text-textSoft dark:text-dark-text/50 uppercase">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-textSoft dark:text-dark-text/50 whitespace-nowrap">
                    {isActive ? 'Attivo' : 'Disattivo'}
                  </span>
                  <MiniToggle checked={isActive} onChange={() => toggleActive(c.id)} />
                </div>
              </div>

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
  const [color, setColor] = useState(COLORS[0]);

  const save = () => {
    if (!title || !date) return;
    onSave({ title, date: new Date(date).toISOString(), color });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
      <div className="card w-full max-w-sm p-5 space-y-3 overflow-hidden">
        <h3 className="text-lg font-bold">Nuovo countdown</h3>
        <input className="input-field" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-field" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <p className="text-sm text-textSoft dark:text-dark-text/60 mb-1.5">Colore</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full shrink-0"
                style={{ background: c, outline: color === c ? '2px solid #2F241D' : 'none' }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1 min-h-[44px]">Annulla</button>
          <button onClick={save} className="btn-primary flex-1 min-h-[44px]">Crea</button>
        </div>
      </div>
    </div>
  );
}
