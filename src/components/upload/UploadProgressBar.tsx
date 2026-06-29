'use client';

import { formatBytes } from '@/lib/upload-limits';
import type { UploadProgress } from '@/lib/upload-with-progress';

type UploadProgressBarProps = {
  progress: UploadProgress | null;
  label?: string;
};

export function UploadProgressBar({ progress, label = 'Subiendo archivos…' }: UploadProgressBarProps) {
  if (!progress) {
    return <p className="text-sm text-muted-foreground">{label}</p>;
  }

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {progress.percent}% · {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
