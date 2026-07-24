const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconHome({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

export function IconNote({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h7M9 16h5" />
    </svg>
  );
}

export function IconCalendar({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function IconHourglass({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 3.5h12M6 20.5h12" />
      <path d="M7 3.5c0 4.5 4 6 5 6.5 1-.5 5-2 5-6.5M7 20.5c0-4.5 4-6 5-6.5 1 .5 5 2 5 6.5" />
    </svg>
  );
}

export function IconSettings({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5M18.1 18.1l-1.5-1.5M7.4 7.4 5.9 5.9" />
    </svg>
  );
}

export function IconSparkle({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
      <path d="M12 8.2 13 12l3.8 1-3.8 1L12 17.8 11 14l-3.8-1L11 12z" />
    </svg>
  );
}

export function IconImage({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5 9.5 13l3 3 3-4 4 5.5" />
    </svg>
  );
}

export function IconStar({ className, filled }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3.8l2.4 5.1 5.5.7-4 3.9.9 5.6-4.8-2.7-4.8 2.7.9-5.6-4-3.9 5.5-.7z" />
    </svg>
  );
}

export function IconClose({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconChevronLeft({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M14.5 5 8 12l6.5 7" />
    </svg>
  );
}

export function IconChevronRight({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9.5 5 16 12l-6.5 7" />
    </svg>
  );
}

export function IconPlus({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconUser({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M5 20c1-3.8 4-5.6 7-5.6s6 1.8 7 5.6" />
    </svg>
  );
}

export function IconHelpBulb({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}
