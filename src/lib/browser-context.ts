/**
 * Detección de contexto del navegador (Safari privado, WebViews de WhatsApp, etc.)
 */

export type InAppBrowserKind =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'messenger'
  | 'line'
  | 'telegram'
  | 'twitter'
  | 'linkedin'
  | 'snapchat'
  | 'generic';

export interface BrowserContextInfo {
  isInAppBrowser: boolean;
  inAppKind?: InAppBrowserKind;
  inAppLabel?: string;
  isPersistentStorageAvailable: boolean;
  /** Contextos donde las cookies/API suelen fallar aunque la UI parezca logueada */
  isRestrictedSessionContext: boolean;
}

let storageAvailableCache: boolean | null = null;

export function isPersistentStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (storageAvailableCache !== null) return storageAvailableCache;

  try {
    const probeKey = '__ingetec_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    storageAvailableCache = true;
  } catch {
    storageAvailableCache = false;
  }

  return storageAvailableCache;
}

export function resetStorageAvailabilityCache(): void {
  storageAvailableCache = null;
}

function matchInAppBrowser(userAgent: string): { kind: InAppBrowserKind; label: string } | null {
  const rules: Array<{ pattern: RegExp; kind: InAppBrowserKind; label: string }> = [
    { pattern: /WhatsApp/i, kind: 'whatsapp', label: 'WhatsApp' },
    { pattern: /Instagram/i, kind: 'instagram', label: 'Instagram' },
    { pattern: /FBAN|FBAV|Facebook/i, kind: 'facebook', label: 'Facebook' },
    { pattern: /Messenger/i, kind: 'messenger', label: 'Messenger' },
    { pattern: /\bLine\//i, kind: 'line', label: 'Line' },
    { pattern: /Telegram/i, kind: 'telegram', label: 'Telegram' },
    { pattern: /Twitter/i, kind: 'twitter', label: 'Twitter/X' },
    { pattern: /LinkedInApp/i, kind: 'linkedin', label: 'LinkedIn' },
    { pattern: /Snapchat/i, kind: 'snapchat', label: 'Snapchat' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(userAgent)) {
      return { kind: rule.kind, label: rule.label };
    }
  }

  // WebView genérico (iOS/Android) sin Safari/Chrome completo
  const isIosWebView =
    /iPhone|iPad|iPod/i.test(userAgent) &&
    /AppleWebKit/i.test(userAgent) &&
    !/Safari/i.test(userAgent);
  const isAndroidWebView = /Android/i.test(userAgent) && /wv\)/i.test(userAgent);

  if (isIosWebView || isAndroidWebView) {
    return { kind: 'generic', label: 'navegador integrado' };
  }

  return null;
}

export function getBrowserContextInfo(): BrowserContextInfo {
  if (typeof window === 'undefined') {
    return {
      isInAppBrowser: false,
      isPersistentStorageAvailable: false,
      isRestrictedSessionContext: false,
    };
  }

  const inApp = matchInAppBrowser(navigator.userAgent || '');
  const storageOk = isPersistentStorageAvailable();
  const isInAppBrowser = !!inApp;

  return {
    isInAppBrowser,
    inAppKind: inApp?.kind,
    inAppLabel: inApp?.label,
    isPersistentStorageAvailable: storageOk,
    isRestrictedSessionContext: isInAppBrowser || !storageOk,
  };
}

export function getRestrictedBrowserMessage(info: BrowserContextInfo): string | null {
  if (info.isInAppBrowser && info.inAppLabel) {
    return `Estás abriendo la app desde ${info.inAppLabel}. Ese navegador suele bloquear la sesión. Toca el menú (⋯) y elige «Abrir en Safari» o «Abrir en Chrome», luego inicia sesión de nuevo.`;
  }

  if (!info.isPersistentStorageAvailable) {
    return 'El modo privado o las restricciones del navegador impiden guardar datos locales. La sesión dependerá solo de las cookies: si algo falla, cierra pestaña e inicia sesión otra vez en Safari o Chrome.';
  }

  return null;
}
