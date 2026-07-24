// Stato reale delle notifiche del browser: 'unsupported' | 'granted' | 'denied' | 'default'
export function getNotificationStatus() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// Beep breve generato con Web Audio API (nessun file audio esterno necessario)
let audioCtx = null;
export function playNotificationSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    console.warn('Audio non disponibile', e);
  }
}

export function sendNotification(title, options = {}, soundEnabled = true) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', ...options });
    if (soundEnabled) playNotificationSound();
    return true;
  } catch (e) {
    console.warn('Notifica non inviata', e);
    return false;
  }
}

// Controlla eventi/countdown in scadenza e invia notifiche.
// reminderMinutesList es. [5, 15, 60, 1440] (1 giorno)
export function checkUpcoming(items, reminderMinutesList, notifiedSet, soundEnabled = true) {
  const now = Date.now();
  items.forEach((item) => {
    if (!item.date) return;
    const target = new Date(item.date).getTime();
    const diffMin = (target - now) / 60000;
    reminderMinutesList.forEach((mins) => {
      const key = `${item.id}_${mins}`;
      if (diffMin > 0 && diffMin <= mins && !notifiedSet.has(key)) {
        notifiedSet.add(key);
        const label = mins >= 1440 ? `${Math.round(mins / 1440)}g` : mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`;
        sendNotification(`Tra poco: ${item.title}`, { body: `Manca circa ${label} — ${item.title}` }, soundEnabled);
      }
    });
    // Countdown scaduto proprio ora
    if (diffMin <= 0 && diffMin > -1 && !notifiedSet.has(`${item.id}_expired`)) {
      notifiedSet.add(`${item.id}_expired`);
      sendNotification(`Scaduto: ${item.title}`, { body: `${item.title} è terminato adesso.` }, soundEnabled);
    }
  });
}
