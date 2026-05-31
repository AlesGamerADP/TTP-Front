'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const LIGHT_THEME_COLOR = '#ffffff';
const DARK_THEME_COLOR = '#1a1a1a';

export function ThemeMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }, [resolvedTheme]);

  return null;
}
