import { useAuth } from '../context/AuthContext';
import { IconUser } from './Icons';

export default function TopBar() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-bg/90 dark:bg-dark-bg/90 backdrop-blur px-5 pt-3 pb-2 flex items-center justify-between max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <img src="/icons/logo-96.png" alt="Prioritize" className="w-7 h-7 rounded-xl object-cover" />
        <span className="font-bold text-sm tracking-tight">Prioritize</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-textSoft dark:text-dark-text/60">
        <IconUser className="w-4 h-4" />
        <span className="font-medium">{user}</span>
      </div>
    </header>
  );
}
