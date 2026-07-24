import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  loadUserData, saveUserData, exportFullBackup, importFullBackup,
  clearAllUserData, downloadJSON
} from '../utils/storage';
import { requestNotificationPermission, getNotificationStatus, playNotificationSound } from '../utils/notifications';
import ConfirmDialog from '../components/ConfirmDialog';

const REMINDER_OPTIONS = [
  { label: '5 minuti prima', value: 5 },
  { label: '15 minuti prima', value: 15 },
  { label: '1 ora prima', value: 60 },
  { label: '1 giorno prima', value: 1440 }
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { showToast } = useToast();
  const [notifSettings, setNotifSettings] = useState({ enabled: false, sound: true, reminders: [15, 60] });
  const [permission, setPermission] = useState(getNotificationStatus());
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'saving'
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const s = loadUserData(user, 'settings', {});
    setNotifSettings(s.notifications || { enabled: false, sound: true, reminders: [15, 60] });
  }, [user]);

  const persistNotif = (updated) => {
    setSyncStatus('saving');
    setNotifSettings(updated);
    try {
      const s = loadUserData(user, 'settings', {});
      saveUserData(user, 'settings', { ...s, notifications: updated });
      setTimeout(() => setSyncStatus('synced'), 400);
    } catch {
      setSyncStatus('synced');
      showToast('Si è verificato un problema. Riprova tra poco.', 'error');
    }
  };

  // Il pulsante riflette lo stato REALE del permesso del browser, non solo una preferenza grafica
  const toggleNotifications = async () => {
    if (permission === 'unsupported') {
      showToast('Il tuo browser non supporta le notifiche push.', 'error');
      return;
    }
    if (!notifSettings.enabled) {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        persistNotif({ ...notifSettings, enabled: true });
        showToast('Notifiche attivate');
      } else {
        persistNotif({ ...notifSettings, enabled: false });
        showToast('Permesso non concesso dal browser.', 'error');
      }
    } else {
      persistNotif({ ...notifSettings, enabled: false });
      showToast('Notifiche disattivate');
    }
  };

  const toggleSound = () => {
    const updated = { ...notifSettings, sound: !notifSettings.sound };
    persistNotif(updated);
    if (updated.sound) playNotificationSound();
  };

  const toggleReminder = (value) => {
    const has = notifSettings.reminders.includes(value);
    const reminders = has ? notifSettings.reminders.filter((r) => r !== value) : [...notifSettings.reminders, value];
    persistNotif({ ...notifSettings, reminders });
  };

  const handleExportBackup = () => {
    try {
      const data = exportFullBackup(user);
      downloadJSON(`prioritize_backup_${user}_${new Date().toISOString().slice(0, 10)}.json`, data);
      showToast('Backup esportato correttamente');
    } catch {
      showToast('Si è verificato un problema. Riprova tra poco.', 'error');
    }
  };

  const handleExportReadable = () => {
    try {
      const data = exportFullBackup(user);
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(16);
      doc.text(`Dati di ${user}`, 15, y);
      y += 10;
      doc.setFontSize(11);
      data.notes.forEach((n) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`Nota: ${n.title || 'Senza titolo'}`, 15, y);
        y += 6;
        const lines = doc.splitTextToSize(n.content || '', 180);
        doc.text(lines, 15, y);
        y += lines.length * 6 + 4;
      });
      doc.save(`prioritize_note_${user}.pdf`);
      showToast('Esportazione leggibile completata');
    } catch {
      showToast('Si è verificato un problema. Riprova tra poco.', 'error');
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        importFullBackup(user, data);
        setImportMsg('Backup importato correttamente. Ricarica la pagina per vedere i dati aggiornati.');
        showToast('Backup importato correttamente');
      } catch {
        setImportMsg('Il file selezionato non è un backup valido.');
        showToast('Si è verificato un problema. Riprova tra poco.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    clearAllUserData(user);
    setConfirmClear(false);
    window.location.reload();
  };

  return (
    <div className="px-5 pt-4 pb-6 max-w-2xl mx-auto page-transition overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Impostazioni</h1>
        <span className="text-xs text-textSoft dark:text-dark-text/50">
          {syncStatus === 'saving' ? 'Sincronizzazione in corso…' : 'Dati sincronizzati ✓'}
        </span>
      </div>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Account</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 dark:bg-dark-primary/20 flex items-center justify-center font-bold text-primary dark:text-dark-primary">
            {user?.[0]}
          </div>
          <p className="text-sm text-textSoft dark:text-dark-text/60">Utente connesso: <span className="font-semibold text-textMain dark:text-dark-text">{user}</span></p>
        </div>
        <button onClick={logout} className="btn-ghost w-full min-h-[48px]">Logout</button>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Notifiche</h2>
        {permission === 'unsupported' && (
          <p className="text-xs text-textSoft dark:text-dark-text/50 mb-3">
            Questo browser non supporta le notifiche push.
          </p>
        )}
        <div className="flex items-center justify-between gap-4 mb-3 pr-1">
          <span className="text-sm">
            Notifiche push {permission === 'granted' && notifSettings.enabled ? '· attive' : '· disattive'}
          </span>
          <Toggle checked={notifSettings.enabled && permission === 'granted'} onChange={toggleNotifications} disabled={permission === 'unsupported'} />
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-primary dark:text-dark-primary mb-3">
            Le notifiche sono bloccate dal browser. Abilitale nelle impostazioni del sito per usarle.
          </p>
        )}
        <div className="flex items-center justify-between gap-4 mb-3 pr-1">
          <span className="text-sm">Suono notifiche</span>
          <Toggle checked={notifSettings.sound} onChange={toggleSound} />
        </div>
        <p className="text-sm font-medium mb-2">Promemoria anticipati</p>
        <div className="space-y-2">
          {REMINDER_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm min-h-[36px]">
              <input
                type="checkbox"
                className="accent-primary w-5 h-5"
                checked={notifSettings.reminders.includes(opt.value)}
                onChange={() => toggleReminder(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Aspetto</h2>
        <div className="flex gap-2">
          {[
            { v: 'light', label: 'Chiaro' },
            { v: 'dark', label: 'Scuro' },
            { v: 'auto', label: 'Automatico' }
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setMode(opt.v)}
              className={`flex-1 px-3 py-2 rounded-full text-sm min-h-[44px] ${mode === opt.v ? 'bg-primary text-white' : 'btn-ghost'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Dati</h2>
        <div className="space-y-2">
          <button onClick={handleExportBackup} className="btn-primary w-full min-h-[48px]">Esporta tutti i miei dati (JSON)</button>
          <button onClick={handleExportReadable} className="btn-ghost w-full min-h-[48px]">Esporta note in PDF leggibile</button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full min-h-[48px]">Importa backup JSON</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImportBackup} />
          {importMsg && <p className="text-xs text-textSoft dark:text-dark-text/60">{importMsg}</p>}
          <button onClick={() => setConfirmClear(true)} className="btn-ghost w-full mt-2 text-primary dark:text-dark-primary min-h-[48px]">Cancella tutti i dati</button>
        </div>
        <p className="text-xs text-textSoft dark:text-dark-text/40 mt-3">
          I dati sono conservati sul dispositivo con cronologia versioni, cestino (30 giorni) e backup
          automatico giornaliero. Per una vera sincronizzazione tra più dispositivi serve un backend
          dedicato (es. Supabase) — non ancora collegato in questa versione.
        </p>
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="Cancellare tutti i dati?"
        message="Questa operazione è irreversibile. Vuoi continuare?"
        onCancel={() => setConfirmClear(false)}
        onConfirm={handleClearAll}
      />
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`shrink-0 self-center w-12 h-7 rounded-full relative transition-colors duration-200 disabled:opacity-40 ${checked ? 'bg-primary' : 'bg-textSoft/25'}`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}
