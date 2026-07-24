import { useAuth } from '../context/AuthContext';
import { IconUser } from './Icons';

export default function TopBar() {
  const { user } = useAuth();
  return (
    <header
      className="sticky top-0 z-30 bg-bg/90 dark:bg-dark-bg/90 backdrop-blur px-5 flex items-center justify-between max-w-2xl mx-auto w-full gap-3"
      style={{ paddingTop: 'calc(14px + env(safe-area-inset-top))', paddingBottom: '10px' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <img src="/icons/logo-96.png" alt="Prioritize" className="w-7 h-7 rounded-xl object-cover shrink-0" />
        <span className="font-bold text-sm tracking-tight truncate">Prioritize</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-textSoft dark:text-dark-text/60 shrink-0 pr-0.5">
        <IconUser className="w-4 h-4 shrink-0" />
        <span className="font-medium whitespace-nowrap">{user}</span>
      </div>
    </header>
  );
}
