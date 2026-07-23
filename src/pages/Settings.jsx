import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  loadUserData, saveUserData, exportFullBackup, importFullBackup,
  clearAllUserData, downloadJSON
} from '../utils/storage';
import { requestNotificationPermission } from '../utils/notifications';
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
  const [notifSettings, setNotifSettings] = useState({ enabled: false, sound: true, reminders: [15, 60] });
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const s = loadUserData(user, 'settings', {});
    setNotifSettings(s.notifications || { enabled: false, sound: true, reminders: [15, 60] });
  }, [user]);

  const persistNotif = (updated) => {
    setNotifSettings(updated);
    const s = loadUserData(user, 'settings', {});
    saveUserData(user, 'settings', { ...s, notifications: updated });
  };

  const toggleNotifications = async () => {
    if (!notifSettings.enabled) {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      persistNotif({ ...notifSettings, enabled: perm === 'granted' });
    } else {
      persistNotif({ ...notifSettings, enabled: false });
    }
  };

  const toggleReminder = (value) => {
    const has = notifSettings.reminders.includes(value);
    const reminders = has ? notifSettings.reminders.filter((r) => r !== value) : [...notifSettings.reminders, value];
    persistNotif({ ...notifSettings, reminders });
  };

  const handleExportBackup = () => {
    const data = exportFullBackup(user);
    downloadJSON(`plaza_backup_${user}_${new Date().toISOString().slice(0, 10)}.json`, data);
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
      } catch {
        setImportMsg('Errore: file di backup non valido.');
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
    <div className="px-5 pt-8 pb-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-6">Impostazioni</h1>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Account</h2>
        <p className="text-sm text-textSoft dark:text-dark-text/60 mb-4">Utente connesso: <span className="font-semibold text-textMain dark:text-dark-text">{user}</span></p>
        <button onClick={logout} className="btn-ghost w-full">Logout</button>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Notifiche</h2>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">Notifiche push</span>
          <Toggle checked={notifSettings.enabled} onChange={toggleNotifications} />
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-primary dark:text-dark-primary mb-3">
            Le notifiche sono bloccate dal browser. Abilitale nelle impostazioni del sito.
          </p>
        )}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">Suono notifiche</span>
          <Toggle checked={notifSettings.sound} onChange={() => persistNotif({ ...notifSettings, sound: !notifSettings.sound })} />
        </div>
        <p className="text-sm font-medium mb-2">Promemoria anticipati</p>
        <div className="space-y-2">
          {REMINDER_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary w-4 h-4"
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
              className={`flex-1 px-3 py-2 rounded-xl2 text-sm ${mode === opt.v ? 'bg-primary text-white' : 'btn-ghost'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5 mb-4">
        <h2 className="font-bold mb-3">Dati</h2>
        <div className="space-y-2">
          <button onClick={handleExportBackup} className="btn-ghost w-full">Esporta backup JSON</button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full">Importa backup JSON</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImportBackup} />
          {importMsg && <p className="text-xs text-textSoft dark:text-dark-text/60">{importMsg}</p>}
          <button onClick={() => setConfirmClear(true)} className="btn-primary w-full mt-2">Cancella tutti i dati</button>
        </div>
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

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-textSoft/30'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}
