import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'System Dashboard', to: '/dashboard' },
  { label: 'The Platform', to: '/platform' },
  { label: 'Capabilities', to: '/capabilities' },
  { label: 'Case Studies', to: '/operations' },
  { label: 'Our Process', to: '/process' },
  { label: 'B2B Supply Hub', to: '/supply-hub' },
  { label: 'Command Center', to: '/operator' },
  { label: 'Global Analytics', to: '/analytics' },
  { label: 'System Status', to: '/system-status' },
  { label: 'Contact', to: '/contact' },
];

type NavVariant = 'landing' | 'dashboard' | 'default';

interface NavProps {
  variant?: NavVariant;
}

export function Nav({ variant = 'default' }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (variant !== 'landing') return;
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant]);

  const hamburgerColor =
    menuOpen
      ? 'bg-black'
      : variant === 'landing' && !scrolled
      ? 'bg-white'
      : variant === 'dashboard'
      ? 'bg-white'
      : 'bg-black';

  const headerClass =
    variant === 'landing'
      ? `fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-6 py-5 md:px-12 md:py-8 transition-all duration-300 ${menuOpen ? 'text-black' : scrolled ? 'bg-black/90 text-white backdrop-blur-md' : 'text-white'}`
      : variant === 'dashboard'
      ? 'absolute top-0 left-0 w-full z-[100] flex justify-between items-center p-8 pointer-events-none text-white'
      : 'sticky top-0 left-0 w-full z-[80] bg-white/85 backdrop-blur-md border-b border-slate-200/80 flex justify-between items-center px-6 py-5 md:px-12 md:py-6';

  const brandClass =
    variant === 'dashboard'
      ? 'font-bold tracking-tight text-xl md:text-2xl uppercase flex items-center gap-2 cursor-pointer z-50 pointer-events-auto'
      : 'font-bold tracking-tight text-xl md:text-2xl uppercase flex items-center gap-2 hover:text-orange-600 transition-colors';

  const buttonClass =
    variant === 'dashboard'
      ? 'flex items-center gap-4 hover:opacity-70 transition-opacity uppercase font-medium text-xs md:text-sm tracking-widest z-50 pointer-events-auto'
      : 'flex items-center gap-4 hover:opacity-70 transition-opacity uppercase font-medium text-xs md:text-sm tracking-widest z-50';

  return (
    <>
      <div className={`bs-nav-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto mt-12 overflow-y-auto max-h-[85vh] pr-4 custom-scrollbar">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`bs-nav-link${location.pathname === to ? ' text-orange-600 border-orange-600 pl-8' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <header className={headerClass}>
        <Link to="/" className={brandClass}>
          ArenaPulse
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={buttonClass}
        >
          <span className="hidden md:block">{menuOpen ? 'Close' : 'Menu'}</span>
          <div className="flex flex-col gap-[6px]">
            <span className={`w-8 h-[2px] block transition-transform origin-center ${menuOpen ? `rotate-45 translate-y-[8px] ${hamburgerColor}` : hamburgerColor}`}></span>
            <span className={`w-8 h-[2px] block transition-transform origin-center ${menuOpen ? `-rotate-45 -translate-y-[8px] ${hamburgerColor}` : hamburgerColor}`}></span>
          </div>
        </button>
      </header>
    </>
  );
}
