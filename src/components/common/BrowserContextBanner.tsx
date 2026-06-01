'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import {
  getBrowserContextInfo,
  getRestrictedBrowserMessage,
  type BrowserContextInfo,
} from '@/lib/browser-context';

interface BrowserContextBannerProps {
  className?: string;
}

export function BrowserContextBanner({ className }: BrowserContextBannerProps) {
  const [info, setInfo] = useState<BrowserContextInfo | null>(null);

  useEffect(() => {
    setInfo(getBrowserContextInfo());
  }, []);

  if (!info?.isRestrictedSessionContext) {
    return null;
  }

  const message = getRestrictedBrowserMessage(info);
  if (!message) {
    return null;
  }

  return (
    <Alert
      variant="destructive"
      className={className}
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        Navegador no recomendado
      </AlertTitle>
      <AlertDescription className="text-sm leading-relaxed">{message}</AlertDescription>
    </Alert>
  );
}
