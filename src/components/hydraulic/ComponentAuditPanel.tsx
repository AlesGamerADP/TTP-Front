'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { componentsApi } from '@/lib/api';
import { STATUS_LABELS, type ComponentStatus } from '@/features/components/model';
import { Shield } from 'lucide-react';

type AuditTimelineRow = {
  id: string;
  status: string;
  changed_at: string;
  notes: string | null;
  user: { id: string; name: string; role: string } | null;
};

type AuditLogRow = {
  id: string;
  action: string;
  resource: string;
  created_at: string;
  user: { full_name: string; role: string } | null;
};

type ComponentAuditPanelProps = {
  componentId: string;
};

export function ComponentAuditPanel({ componentId }: ComponentAuditPanelProps) {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<AuditTimelineRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [prevId, setPrevId] = useState(componentId);
  if (componentId !== prevId) {
    setPrevId(componentId);
    setLoading(true);
    setTimeline([]);
    setAuditLogs([]);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void componentsApi
      .getAuditTrail(componentId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as {
          timeline: AuditTimelineRow[];
          auditLogs: AuditLogRow[];
        };
        setTimeline(data.timeline ?? []);
        setAuditLogs(data.auditLogs ?? []);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [componentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Auditoría y trazabilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-h-96 overflow-y-auto">
        <div>
          <h4 className="text-sm font-medium mb-2">Historial de estados</h4>
          <ul className="space-y-2">
            {timeline.map((row) => (
              <li key={row.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <Badge variant="outline">
                    {STATUS_LABELS[row.status as ComponentStatus] ?? row.status}
                  </Badge>
                  <time className="text-xs text-muted-foreground">
                    {new Date(row.changed_at).toLocaleString('es-ES')}
                  </time>
                </div>
                {row.user && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.user.name} · rol {row.user.role}
                  </p>
                )}
                {row.notes && <p className="mt-1 text-xs">{row.notes}</p>}
              </li>
            ))}
          </ul>
        </div>

        {auditLogs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Registro del sistema</h4>
            <ul className="space-y-2">
              {auditLogs.map((log) => (
                <li key={log.id} className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium">{log.action}</span>
                  {' · '}
                  {new Date(log.created_at).toLocaleString('es-ES')}
                  {log.user && (
                    <>
                      {' · '}
                      {log.user.full_name} ({log.user.role})
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
