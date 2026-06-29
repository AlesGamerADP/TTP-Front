'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';

interface ManagementPageLayoutProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Layout común para pantallas de gestión (usuarios, empresas, etc.). */
export function ManagementPageLayout({
  title,
  description,
  icon,
  actions,
  filters,
  children,
  className,
}: ManagementPageLayoutProps) {
  return (
    <Card className={cn('border-border/80 shadow-sm', className)}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5 min-w-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            {icon}
            {title}
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {filters ? (
          <div className="management-filters grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {filters}
          </div>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
