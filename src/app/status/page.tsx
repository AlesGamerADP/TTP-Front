'use client';

import { useEffect, useState } from 'react';
import { resolveApiUrl } from '@/lib/api-config';

type Check = { name: string; ok: boolean; detail?: string };

export default function StatusPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const results: Check[] = [
        { name: 'Frontend', ok: true, detail: 'Next.js operativo' },
      ];

      const liveUrl = resolveApiUrl('/live');
      const readyUrl = resolveApiUrl('/ready');
      const meUrl = resolveApiUrl('/api/users/me');

      try {
        const live = await fetch(liveUrl, { credentials: 'include' });
        results.push({
          name: 'Backend /live',
          ok: live.ok,
          detail: live.ok ? 'ok' : `HTTP ${live.status}`,
        });
      } catch {
        results.push({ name: 'Backend /live', ok: false, detail: 'Sin conexión' });
      }

      try {
        const ready = await fetch(readyUrl, { credentials: 'include' });
        const body = ready.ok ? await ready.json().catch(() => ({})) : {};
        results.push({
          name: 'Backend /ready',
          ok: ready.ok,
          detail: JSON.stringify(body),
        });
      } catch {
        results.push({ name: 'Backend /ready', ok: false, detail: 'Sin conexión' });
      }

      try {
        const me = await fetch(meUrl, { credentials: 'include' });
        results.push({
          name: 'API autenticada',
          ok: me.status !== 0,
          detail: me.ok ? 'Sesión activa' : me.status === 401 ? 'Sin sesión (esperado si no hay login)' : `HTTP ${me.status}`,
        });
      } catch {
        results.push({ name: 'API autenticada', ok: false, detail: 'Error de red' });
      }

      setChecks(results);
      setLoading(false);
    };

    void run();
  }, []);

      const allOk =
    checks.length > 0 &&
    checks.filter((c) => c.name !== 'API autenticada').every((c) => c.ok);

  const sessionCheck = checks.find((c) => c.name === 'API autenticada');
  const backendDown = checks.some(
    (c) => (c.name === 'Backend /live' || c.name === 'Backend /ready') && !c.ok,
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Estado del sistema</h1>
      <p className="text-sm text-muted-foreground mb-6">Comprobaciones básicas front + back</p>
      {loading ? (
        <p className="text-sm">Comprobando…</p>
      ) : (
        <>
          <p className={`mb-4 text-sm font-medium ${allOk ? 'text-green-700' : 'text-amber-700'}`}>
            {allOk ? 'Operativo' : backendDown ? 'Backend no disponible' : 'Revisar servicios marcados'}
          </p>
          {sessionCheck && !sessionCheck.ok && sessionCheck.detail?.includes('401') && !backendDown && (
            <p className="mb-4 text-xs text-muted-foreground">
              Sin sesión activa (normal si no has iniciado sesión). El backend responde correctamente.
            </p>
          )}
          <ul className="space-y-3">
            {checks.map((check) => (
              <li key={check.name} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{check.name}</span>
                  <span className={check.ok ? 'text-green-600' : 'text-red-600'}>
                    {check.ok ? 'OK' : 'Fallo'}
                  </span>
                </div>
                {check.detail && (
                  <p className="mt-1 text-xs text-muted-foreground break-all">{check.detail}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
