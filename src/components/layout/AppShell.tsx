import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ListOrdered, Building2, UserRound, LogOut, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

const links = [
  { to: '/', icon: Home, key: 'nav.home', end: true },
  { to: '/operations', icon: ListOrdered, key: 'nav.operations' },
  { to: '/brokers', icon: Building2, key: 'nav.brokers' },
  { to: '/profile', icon: UserRound, key: 'nav.profile' },
];

export function AppShell() {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background to-background md:flex-row">
      {/* Sidebar (md+) */}
      <aside className="hidden w-60 shrink-0 border-r bg-card/40 md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 px-5 text-lg font-bold tracking-tight">
          <Sparkles className="size-5 text-primary" />
          {t('app.name')}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <l.icon className="size-4" />
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button
            className="mb-2 w-full text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt-BR')}
          >
            {i18n.language.startsWith('pt') ? 'Switch to English' : 'Mudar para Português'}
          </button>
          <Button variant="outline" size="sm" className="w-full" onClick={() => void supabase.auth.signOut()}>
            <LogOut className="size-4" />
            {t('auth.signOut')}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 pt-safe backdrop-blur md:hidden">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="size-5 text-primary" />
          {t('app.name')}
        </div>
        <button
          className="text-xs text-muted-foreground"
          onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt-BR')}
        >
          {i18n.language.startsWith('pt') ? 'EN' : 'PT'}
        </button>
      </header>

      <main className="flex-1 overflow-x-hidden pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-safe backdrop-blur md:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <l.icon className="size-5" />
            {t(l.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
