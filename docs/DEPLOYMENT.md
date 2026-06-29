# Despliegue INGETEC (Vercel + Render + Cloudinary)

## Frontend (Vercel)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL pública del API (ej. `https://api.tudominio.com`) o vacío para proxy `/api` |
| `INTERNAL_API_URL` | URL del backend para SSR (Render) |
| `NEXT_PUBLIC_USE_BROWSER_API_PROXY` | `true` si el navegador usa rutas same-origin `/api/*` |

## Backend (Render)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL (Neon, etc.) |
| `JWT_SECRET` | Secreto JWT |
| `REDIS_URL` | Redis para rate limit + **SSE multi-réplica** |
| `FRONTEND_URL` | Origen CORS (Vercel) |
| `CLOUDINARY_*` / storage local | Subida de fotos y documentos |
| `NOTIFY_STATUS_EMAIL` | `true` para email al cambiar estado (Resend/Brevo) |
| `RESEND_API_KEY` / `BREVO_API_KEY` | Proveedor de email |
| `SENTRY_DSN` | Errores en producción |

Healthchecks Render: `GET /ready` (DB + Redis).

## Staging

Duplicar servicios con las mismas variables y `FRONTEND_URL` del preview de Vercel. Probar SSE y subidas en dos fases antes de producción.

## Backups

- **BD:** backups automáticos del proveedor PostgreSQL + export periódico.
- **Archivos:** Cloudinary mantiene copias; documentar carpeta `uploads/` si se usa almacenamiento local.

## Antivirus

No integrado por defecto. En entornos regulados, escanear adjuntos en un worker (ClamAV) antes de `persistUploadedFile`.

## SSE

- Una réplica: funciona sin Redis.
- Varias réplicas: obligatorio `REDIS_URL` para pub/sub (`componentStreamPubSub.ts`).

## Subidas timeline

1. `POST /api/components/:id/events/metadata` — estado visible al instante.
2. `POST /api/components/:id/events/:eventId/attachments` — fotos/PDF con progreso en cliente.

Límite: **10 MB** por archivo.
