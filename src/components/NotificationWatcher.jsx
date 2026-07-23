import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserData } from '../utils/storage';
import { checkUpcoming } from '../utils/notifications';

export default function NotificationWatcher() {
  const { user } = useAuth();
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    const run = () => {
      const settings = loadUserData(user, 'settings', {});
      const notif = settings.notifications;
      if (!notif?.enabled) return;

      const events = loadUserData(user, 'events', []).filter((e) => e.status !== 'completato');
      const countdowns = loadUserData(user, 'countdowns', []);
      const reminders = notif.reminders?.length ? notif.reminders : [15, 60];

      checkUpcoming(events, reminders, notifiedRef.current);
      checkUpcoming(countdowns, reminders, notifiedRef.current);
    };

    run();
    const interval = setInterval(run, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return null;
}
