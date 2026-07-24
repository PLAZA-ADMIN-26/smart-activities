// Storage con namespace per utente: ogni chiave è prefissata con l'utente
// così MIRKO e ADMIN vedono solo i propri dati (notes_MIRKO, notes_ADMIN, ecc.)

const keyFor = (user, base) => `${base}_${user}`;

export function loadUserData(user, base, fallback) {
  try {
    const raw = localStorage.getItem(keyFor(user, base));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveUserData(user, base, value) {
  try {
    localStorage.setItem(keyFor(user, base), JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Errore di salvataggio', e);
    return false;
  }
}

// Cestino: elementi eliminati restano recuperabili per 30 giorni
const TRASH_RETENTION_DAYS = 30;

export function moveToTrash(user, type, item) {
  const trash = loadUserData(user, 'trash', []);
  trash.push({ type, item, deletedAt: Date.now() });
  saveUserData(user, 'trash', trash);
}

export function getTrash(user) {
  const trash = loadUserData(user, 'trash', []);
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const valid = trash.filter((t) => t.deletedAt > cutoff);
  if (valid.length !== trash.length) saveUserData(user, 'trash', valid);
  return valid;
}

export function restoreFromTrash(user, index) {
  const trash = loadUserData(user, 'trash', []);
  const entry = trash[index];
  if (!entry) return null;
  trash.splice(index, 1);
  saveUserData(user, 'trash', trash);
  return entry;
}

export function permanentlyDeleteFromTrash(user, index) {
  const trash = loadUserData(user, 'trash', []);
  trash.splice(index, 1);
  saveUserData(user, 'trash', trash);
}

// Cronologia versioni di una nota: mantiene le ultime 10 istantanee
// così da poter ripristinare una versione precedente.
const MAX_NOTE_VERSIONS = 10;

export function pushNoteVersion(note, editedBy) {
  const history = note.history || [];
  const snapshot = {
    title: note.title,
    content: note.content,
    checklist: note.checklist,
    links: note.links,
    editedBy,
    savedAt: Date.now()
  };
  const updatedHistory = [snapshot, ...history].slice(0, MAX_NOTE_VERSIONS);
  return updatedHistory;
}

export function restoreNoteVersion(note, versionIndex) {
  const version = note.history?.[versionIndex];
  if (!version) return note;
  return {
    ...note,
    title: version.title,
    content: version.content,
    checklist: version.checklist,
    links: version.links,
    updatedAt: Date.now()
  };
}

// Backup completo (tutte le sezioni) in un unico oggetto JSON
export function exportFullBackup(user) {
  const data = {
    user,
    exportedAt: new Date().toISOString(),
    notes: loadUserData(user, 'notes', []),
    events: loadUserData(user, 'events', []),
    countdowns: loadUserData(user, 'countdowns', []),
    settings: loadUserData(user, 'settings', {}),
    trash: loadUserData(user, 'trash', [])
  };
  return data;
}

export function importFullBackup(user, data) {
  if (!data || typeof data !== 'object') throw new Error('File di backup non valido');
  if (Array.isArray(data.notes)) saveUserData(user, 'notes', data.notes);
  if (Array.isArray(data.events)) saveUserData(user, 'events', data.events);
  if (Array.isArray(data.countdowns)) saveUserData(user, 'countdowns', data.countdowns);
  if (data.settings && typeof data.settings === 'object') saveUserData(user, 'settings', data.settings);
  if (Array.isArray(data.trash)) saveUserData(user, 'trash', data.trash);
  return true;
}

export function clearAllUserData(user) {
  ['notes', 'events', 'countdowns', 'trash'].forEach((base) => {
    localStorage.removeItem(keyFor(user, base));
  });
}

// Backup automatico giornaliero: tiene traccia dell'ultima data di backup
// e salva uno snapshot in daily_backups_<user> (mantiene ultimi 10)
export function maybeRunDailyBackup(user) {
  const today = new Date().toISOString().slice(0, 10);
  const lastRun = loadUserData(user, 'lastBackupDate', null);
  if (lastRun === today) return;

  const backups = loadUserData(user, 'dailyBackups', []);
  backups.push({ date: today, data: exportFullBackup(user) });
  while (backups.length > 10) backups.shift();
  saveUserData(user, 'dailyBackups', backups);
  saveUserData(user, 'lastBackupDate', today);
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
