import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconPlus, IconNote, IconCalendar } from './Icons';

export default function QuickActionButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Non mostrare il FAB dentro l'editor nota o sopra i modali a schermo intero
  if (location.pathname === '/note' && location.state?.editing) return null;

  return (
    <div className="fixed right-5 z-40" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
      {open && (
        <div className="flex flex-col items-end gap-2 mb-3 animate-fade-in">
          <button
            onClick={() => { setOpen(false); navigate('/calendario'); }}
            className="flex items-center gap-2 bg-card dark:bg-dark-card shadow-soft rounded-full pl-4 pr-3 py-2.5 text-sm font-medium"
          >
            Nuova attività <IconCalendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/note', { state: { createNew: true } }); }}
            className="flex items-center gap-2 bg-card dark:bg-dark-card shadow-soft rounded-full pl-4 pr-3 py-2.5 text-sm font-medium"
          >
            Nuova nota <IconNote className="w-4 h-4" />
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-primary dark:bg-dark-primary text-white shadow-soft flex items-center justify-center transition-transform duration-200 active:scale-95"
        style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        aria-label="Azioni rapide"
      >
        <IconPlus className="w-6 h-6" />
      </button>
    </div>
  );
}
