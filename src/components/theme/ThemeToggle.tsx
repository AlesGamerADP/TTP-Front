'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { persistentStorage } from '@/lib/storage';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'default' | 'icon';
}

export function ThemeToggle({ className, size = 'sm' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !resolvedTheme) return;
    const prefs = persistentStorage.getPreferences() ?? {};
    persistentStorage.savePreferences({
      ...prefs,
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
    });
  }, [mounted, resolvedTheme]);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        aria-label="Cambiar tema"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
