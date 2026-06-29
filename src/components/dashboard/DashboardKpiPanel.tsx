'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { componentsApi, type KpiResponse } from '@/lib/api';
import { STATUS_LABELS, type ComponentStatus } from '@/features/components/model';
import { AlertTriangle, BarChart3 } from 'lucide-react';

type KpiData = KpiResponse;

export function DashboardKpiPanel() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void componentsApi
      .getKpis()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Cargando indicadores…
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(1, ...data.bottleneck.map((b) => b.count));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Cuellos de botella por estado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.bottleneck.map((item) => (
            <div key={item.status}>
              <div className="flex justify-between text-sm mb-1">
                <span>{STATUS_LABELS[item.status as ComponentStatus] ?? item.status}</span>
                <span className="tabular-nums font-medium">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/80 transition-all"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {data.avgDaysInStatus.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Tiempo medio en estado actual:{' '}
              {data.avgDaysInStatus
                .map(
                  (a) =>
                    `${STATUS_LABELS[a.status as ComponentStatus] ?? a.status}: ${a.avgDays}d`,
                )
                .join(' · ')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Estancados ({data.staleDays}+ días sin movimiento)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums mb-3">{data.staleCount}</p>
          {data.stalePreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguno en este umbral.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.stalePreview.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs">{c.serial_number}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {STATUS_LABELS[c.current_status as ComponentStatus] ?? c.current_status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
