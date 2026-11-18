import React, { useState } from 'react';
import { Menu, X, SunMoon, Languages, User as UserIcon, ShieldCheck, Home, Smartphone, Crosshair, GitCompare, LayoutDashboard } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AppRoute, LanguageCode, ThemeMode } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface NavbarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: User | null;
  isAdmin: boolean;
  language: LanguageCode;
  onToggleLanguage: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  announcementBanner?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRoute,
  onNavigate,
  user,
  isAdmin,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  onOpenAuth,
  announcementBanner,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const navItems: { id: AppRoute; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t.navHome, icon: <Home className="w-4 h-4" /> },
    { id: 'devices', label: t.navDevices, icon: <Smartphone className="w-4 h-4" /> },
    { id: 'generator', label: t.navGenerator, icon: <Crosshair className="w-4 h-4" /> },
    { id: 'compare', label: t.navCompare, icon: <GitCompare className="w-4 h-4" /> },
    { id: 'dashboard', label: t.navDashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060609]/90 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-display text-2xl font-extrabold tracking-tight text-white hover:text-rose-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            HEADSHOT LAB
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-rose-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA + mobile drawer button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('generator')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer glow-crimson"
            >
              {t.navPrimaryCta}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg border border-white/10 text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Workspace utility sub-strip */}
        <div className="border-t border-white/5 bg-black/40">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-zinc-400">
              <span>Free Fire India Optimization</span>
              {announcementBanner && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-violet-300 truncate max-w-[260px] sm:max-w-md">{announcementBanner}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Languages className="w-3.5 h-3.5 text-violet-400" />
                {language === 'en' ? 'EN / हिं' : 'हिं / EN'}
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <SunMoon className="w-3.5 h-3.5 text-rose-400" />
                {theme === 'dark' ? 'Dark' : 'AMOLED'}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeRoute === 'admin'
                      ? 'border-violet-500 bg-violet-500/20 text-violet-200'
                      : 'border-white/10 text-violet-300 hover:border-violet-400/50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.navAdmin}
                </button>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/10 text-zinc-200 hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer max-w-[160px]"
                >
                  <UserIcon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{user.displayName || user.email?.split('@')[0] || 'Account'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  {t.signIn}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-down drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[104px] z-40 bg-[#0b0c10] border-b border-white/10 p-4 space-y-2 shadow-2xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeRoute === item.id
                  ? 'bg-rose-600/20 text-white border border-rose-500/40'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onNavigate('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-violet-300 hover:bg-white/5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {t.navAdmin}
            </button>
          )}
        </div>
      )}

      {/* Mobile compact bottom navigation bar (<= 15% height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#08090d]/95 backdrop-blur-md border-t border-white/10 grid grid-cols-5"
      >
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${
                isActive ? 'text-rose-400' : 'text-zinc-400'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
