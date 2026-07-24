import { NavLink } from 'react-router-dom';
import { IconHome, IconNote, IconCalendar, IconHourglass, IconSettings } from './Icons';

const TABS = [
  { to: '/', label: 'Home', Icon: IconHome, end: true },
  { to: '/note', label: 'Note', Icon: IconNote },
  { to: '/calendario', label: 'Calendario', Icon: IconCalendar },
  { to: '/countdown', label: 'Countdown', Icon: IconHourglass },
  { to: '/impostazioni', label: 'Impostazioni', Icon: IconSettings }
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-dark-card/95 backdrop-blur border-t border-textSoft/10 dark:border-dark-text/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch max-w-2xl mx-auto">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1 min-w-0">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-xs font-medium transition-colors duration-200 min-h-[58px] w-full ${
                  isActive ? 'text-primary dark:text-dark-primary' : 'text-textSoft dark:text-dark-text/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-primary dark:bg-dark-primary transition-all duration-200" />
                  )}
                  <tab.Icon className="w-6 h-6 shrink-0" />
                  <span className="leading-none truncate max-w-full">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
