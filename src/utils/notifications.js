export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', ...options });
  } catch (e) {
    console.warn('Notifica non inviata', e);
  }
}

// Controlla eventi/countdown in scadenza e invia notifiche.
// reminderMinutesList es. [5, 15, 60, 1440] (1 giorno)
export function checkUpcoming(items, reminderMinutesList, notifiedSet) {
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
        sendNotification(`Tra poco: ${item.title}`, { body: `Manca circa ${label} — ${item.title}` });
      }
    });
  });
}
