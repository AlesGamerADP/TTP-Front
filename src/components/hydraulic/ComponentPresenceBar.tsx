'use client';

import { Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useComponentPresence } from '@/features/components/hooks/useComponentPresence';

type ComponentPresenceBarProps = {
  componentId: string;
};

export function ComponentPresenceBar({ componentId }: ComponentPresenceBarProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const viewers = useComponentPresence(componentId, true);
  const others = viewers.filter((v) => v.userId !== userId);

  if (others.length === 0) return null;

  const label =
    others.length === 1
      ? `${others[0].name} está viendo este componente`
      : `${others.map((v) => v.name).join(', ')} están viendo este componente`;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Users className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
