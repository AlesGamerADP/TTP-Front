/**
 * iOS: todos los navegadores usan WebKit (CriOS, FxiOS, EdgiOS…).
 * object/iframe con PDF suele fallar en móvil; en escritorio el iframe + blob funciona.
 */
export function isIosWebKitBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (/CriOS|FxiOS|EdgiOS/.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;

  return false;
}

export function shouldUseCanvasPdfViewer(isMobileViewport: boolean): boolean {
  return isMobileViewport || isIosWebKitBrowser();
}
