/** Debe coincidir con MAX_FILE_SIZE del backend (components.ts) */
export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;

export const MAX_UPLOAD_FILE_LABEL = '10 MB';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateUploadFiles(files: File[]): { ok: true } | { ok: false; message: string } {
  for (const file of files) {
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      return {
        ok: false,
        message: `"${file.name}" supera el máximo de ${MAX_UPLOAD_FILE_LABEL} (${formatBytes(file.size)}).`,
      };
    }
  }
  return { ok: true };
}
